import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { mongo } from '@ctip/toolkit';
import { Job, CreateJobRequest } from '../../types/job';
import { processZipFile, ProcessedZipResult } from '../../services/ZipfileProcessor';
import { getDesignElementsByCID, loadDomainList } from '../../services/promptServiceForVendor';
import { getLLMEvidenceWithProgress, ProcessingProgress } from '../../services/evidenceService';
import { getDomainIdsFromQuestionnaire } from '../../services/questionnaireService';
import JSZip from 'jszip';
import axios from 'axios';
import https from 'https';

const collection = mongo.collection;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb', // Allow up to 50MB file uploads
        },
    },
};

// Helper function to process ZIP file from buffer (Node.js environment)
async function processZipFileFromBuffer(buffer: Buffer): Promise<ProcessedZipResult> {
  const result: Omit<ProcessedZipResult, 'questionnaireFile'> = {
    controls: [],
    totalFiles: 0,
    totalControls: 0,
    errors: []
  };
  let questionnaireFile: { name: string; content: ArrayBuffer } | null = null;

  try {
    console.log('Starting ZIP file processing from buffer...');
    console.log('Buffer length:', buffer.length);
    console.log('Buffer type:', typeof buffer);
    console.log('Buffer constructor:', buffer.constructor.name);
    
    const zip = new JSZip();
    let zipContent;
    try {
      zipContent = await zip.loadAsync(buffer);
      console.log('ZIP loaded successfully');
    } catch (zipError) {
      console.error('JSZip loading error:', zipError);
      throw new Error(`Failed to load ZIP file: ${zipError.message}`);
    }

    // Get the root folder name first (needed for questionnaire file detection)
    const rootFolder = getRootFolderName(zipContent);
    console.log('Root folder:', rootFolder);

    // Find and extract the Excel file's content first (only at root level)
    console.log('Searching for questionnaire file at root level...');
    const allExcelFiles = Object.values(zipContent.files).filter(file => !file.dir && isExcelFile(file.name));
    console.log('All Excel files found:', allExcelFiles.map(f => f.name));

    const excelFileEntry = allExcelFiles.find(
      file => isRootLevelFile(file.name, rootFolder)
    );

    if (excelFileEntry) {
      console.log(`Found questionnaire file at root level: ${excelFileEntry.name}`);
      const content = await excelFileEntry.async('arraybuffer');
      questionnaireFile = { name: excelFileEntry.name, content };
    } else {
      console.log('No questionnaire file found at root level');
    }

    // Load domain list
    const domainList = await loadDomainList();
    const domainNameToIdsMap = createDomainNameToIdsMap(domainList);

    // Collect all valid subfolders
    const subfolders = new Set<string>();
    Object.entries(zipContent.files).forEach(([path, file]) => {
      if (file.dir) {
        const folderName = getSubfolderName(path, rootFolder);
        if (folderName && (!rootFolder || folderName !== rootFolder)) {
          subfolders.add(folderName);
        }
      }
    });
    console.log('Found subfolders:', Array.from(subfolders));

    // Process each subfolder
    for (const folderName of subfolders) {
      const normalizedFolderName = normalizeName(folderName);
      const domainIds = domainNameToIdsMap.get(normalizedFolderName);

      if (!domainIds || domainIds.length === 0) {
        console.warn(`Could not map folder "${folderName}" to any Domain_Id`);
        result.errors.push(`Unmapped folder: ${folderName}`);
        continue;
      }
      console.log(`Mapped folder "${folderName}" to Domain IDs:`, domainIds);

      // Find all files in this folder
      const folderPrefix = rootFolder ? `${rootFolder}/${folderName}/` : `${folderName}/`;
      const folderFiles = Object.entries(zipContent.files)
        .filter(([path, file]) => !file.dir && path.startsWith(folderPrefix));

      const evidences: File[] = [];
      for (const [filePath, fileEntry] of folderFiles) {
        const content = await fileEntry.async('arraybuffer');
        const fileName = getFolderName(filePath);
        const fileType = getMimeType(fileName);
        const fileSize = content.byteLength;

        // Create a file-like object with base64 content for Node.js environment
        const base64Content = Buffer.from(content).toString('base64');
        const dataUrl = `data:${fileType};base64,${base64Content}`;
        
        const file = {
          name: fileName,
          type: fileType,
          size: fileSize,
          lastModified: fileEntry.date.getTime(),
          base64: dataUrl,
          arrayBuffer: () => Promise.resolve(content),
          stream: () => Buffer.from(content),
          text: () => Promise.resolve(''),
          slice: (start: number, end: number) => content.slice(start, end)
        };

        evidences.push(file);
      }

      // Add to controls array
      result.controls.push({
        cid: domainIds[0], // Use first matching Domain_Id
        controlName: folderName,
        domainIds,
        evidences
      });
      console.log(`Added control group "${folderName}" with ${evidences.length} evidence files`);
    }

    result.totalFiles = result.controls.reduce((sum, control) => sum + control.evidences.length, 0);
    result.totalControls = result.controls.length;

    console.log('ZIP processing complete:', {
      totalControls: result.totalControls,
      totalFiles: result.totalFiles,
      errors: result.errors,
      questionnaireFile
    });

    return { ...result, questionnaireFile };

  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw error;
  }
}

// Helper functions (copied from ZipfileProcessor.ts)
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function createDomainNameToIdsMap(domains: any[]): Map<string, string[]> {
  const domainNameToIdsMap: Map<string, string[]> = new Map();
  for (const item of domains) {
    const name = item.Domain_Name.trim().toLowerCase();
    if (!domainNameToIdsMap.has(name)) {
      domainNameToIdsMap.set(name, []);
    }
    domainNameToIdsMap.get(name)?.push(item.Domain_Id);
  }
  return domainNameToIdsMap;
}

function getRootFolderName(zipContent: JSZip): string | null {
  const paths = Object.keys(zipContent.files);
  const rootFolders = paths
    .filter(path => {
      const parts = path.split('/').filter(Boolean);
      return parts.length === 1 && zipContent.files[path].dir;
    })
    .map(path => path.replace('/', ''));
  return rootFolders.length > 0 ? rootFolders[0] : null;
}

function getSubfolderName(path: string, rootFolder: string | null): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  if (rootFolder && parts[0] === rootFolder && parts.length > 1) {
    return parts[1];
  }
  return parts[0] || '';
}

function normalizePath(path: string): string {
  return path.replace(/[\\/]+/g, '/').trim();
}

function getFolderName(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function isExcelFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension === 'xlsx' || extension === 'xls' || extension === 'xlsm';
}

function isRootLevelFile(filePath: string, rootFolder: string | null): boolean {
  const normalizedPath = normalizePath(filePath);
  const pathParts = normalizedPath.split('/').filter(Boolean);
  
  if (rootFolder) {
    const isRootLevel = pathParts.length === 2 && pathParts[0] === rootFolder;
    return isRootLevel;
  } else {
    const isRootLevel = pathParts.length === 1;
    return isRootLevel;
  }
}

// Node.js compatible evidence processing function
async function processEvidenceWithLLMNodeJS(
  controlPromptList: Array<{
    controlId: string;
    prompts: Array<{ id: string; prompt: string; question: string; subQuestion: string; }>;
    files: any[];
  }>,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Record<string, any[]>> {
  const results: Record<string, any[]> = {};
  let completedControls = 0;
  const totalControls = controlPromptList.length;

  for (const control of controlPromptList) {
    if (!control) continue;
    
    const { controlId, prompts, files } = control;
    const controlResults: any[] = [];

    try {
      // Get system prompt from database
      const system_prompt = await collection('Prompts').findOne({ Prompt_Name: "System Prompt" });
      
      if (!system_prompt) {
        throw new Error('System prompt not found');
      }

      // Process each prompt for this control
      for (const prompt of prompts) {
        try {
          // Prepare evidence data (files already have base64 content)
          const evidences = files.map(file => ({
            name: file.name,
            base64: file.base64
          }));

          // Call the existing validateControlBatch API
          const response = await axios.post(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/validateControlBatch`, {
            controlId: prompt.id,
            designElements: [{
              id: prompt.id,
              prompt: prompt.prompt,
              question: prompt.question,
              subQuestion: prompt.subQuestion
            }],
            evidences: evidences
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.LLM_API_KEY || 'dummy-token'}`
            },
            httpsAgent: new https.Agent({ 
              rejectUnauthorized: false,
            })
          });

          if (response.data && response.data.results && response.data.results.length > 0) {
            const result = response.data.results[0];
            controlResults.push({
              designElementId: prompt.id,
              designElement: prompt.subQuestion,
              answer: result.answer,
              status: result.status,
              error: result.error
            });
          } else {
            controlResults.push({
              designElementId: prompt.id,
              designElement: prompt.subQuestion,
              answer: '',
              status: 'error',
              error: 'No response from LLM'
            });
          }
        } catch (error) {
          console.error(`Error processing prompt ${prompt.id}:`, error);
          controlResults.push({
            designElementId: prompt.id,
            designElement: prompt.subQuestion,
            answer: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      results[controlId] = controlResults;
      completedControls++;

      // Update progress
      if (onProgress) {
        onProgress({
          completedControls,
          totalControls,
          currentControl: controlId,
          progress: Math.round((completedControls / totalControls) * 100)
        });
      }

    } catch (error) {
      console.error(`Error processing control ${controlId}:`, error);
      // Add error results for all prompts in this control
      for (const prompt of prompts) {
        controlResults.push({
          designElementId: prompt.id,
          designElement: prompt.subQuestion,
          answer: '',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      results[controlId] = controlResults;
      completedControls++;
    }
  }

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userName, zipFile } = req.body as CreateJobRequest & { zipFile: string };

    if (!userId || !userName || !zipFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate UUID for the job
    const jobUUID = uuidv4();

    // Create job document in MongoDB using CTIP
    const jobsCollection = collection('jobs');

    const job: Job = {
      UUID: jobUUID,
      userId,
      userName,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      zipFileName: req.body.zipFileName,
      zipFileSize: req.body.zipFileSize
    };

    await jobsCollection.insertOne(job);

    // Start asynchronous processing
    processZipAsync(jobUUID, zipFile).catch(error => {
      console.error(`Error processing job ${jobUUID}:`, error);
      // Update job status to failed
      jobsCollection.updateOne(
        { UUID: jobUUID },
        { 
          $set: { 
            status: 'Failed',
            updatedAt: new Date(),
            result: { error: error.message }
          }
        }
      );
    });

    return res.status(200).json({ 
      message: 'Job created successfully',
      jobUUID,
      status: 'Pending'
    });

  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({ 
      error: 'Failed to create job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processZipAsync(jobUUID: string, zipFileBase64: string) {
  const jobsCollection = collection('jobs');

  try {
    // Update status to Processing
    await jobsCollection.updateOne(
      { UUID: jobUUID },
      { 
        $set: { 
          status: 'Processing',
          updatedAt: new Date()
        }
      }
    );

    const startTime = Date.now();

    // Convert base64 back to binary data
    const base64Data = zipFileBase64.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Process ZIP file directly with binary data
    const zipResult = await processZipFileFromBuffer(binaryData);
    console.log('ZIP processing result:', zipResult);

    // Get domain IDs from excel file if it exists
    const domainIdsFromExcel = zipResult.questionnaireFile?.content
      ? await getDomainIdsFromQuestionnaire(zipResult.questionnaireFile.content)
      : null;

    // Load domain list
    const domainList = await loadDomainList();
    const mainQuestionMap = new Map(domainList.map(d => [d.Domain_Id, d.Question]));

    // Prepare control prompts
    const controlPromptList = (await Promise.all(
      zipResult.controls.map(async (controlGroup) => {
        const validDomainIds = domainIdsFromExcel
          ? controlGroup.domainIds.filter(id => domainIdsFromExcel.includes(id))
          : controlGroup.domainIds;

        if (validDomainIds.length === 0) {
          return null;
        }

        const promptsForGroup = await Promise.all(
          validDomainIds.map(async (domainId) => {
            const [, designElements] = await getDesignElementsByCID(domainId);
            return {
              controlId: domainId,
              prompts: designElements.map(element => ({
                id: element.id,
                prompt: element.prompt,
                question: element.question,
                subQuestion: element.design_element
              })),
              files: controlGroup.evidences
            };
          })
        );
        return promptsForGroup;
      })
    )).flat().filter(Boolean);

    if (controlPromptList.length === 0) {
      throw new Error('No valid controls found to process after filtering.');
    }

    // Process with LLM using Node.js compatible method
    const onProgress = (progress: ProcessingProgress) => {
      console.log('Progress update:', progress);
    };

    const batchResults = await processEvidenceWithLLMNodeJS(controlPromptList, onProgress);

    // Transform batch results into report format
    const reportResults = controlPromptList.flatMap(control => {
      if (!control) return [];
      const resultsForControl = batchResults[control.controlId] || [];
      const mainQuestion = mainQuestionMap.get(control.controlId) || 'Unknown Question';

      return control.prompts.map((prompt, index) => {
        const result = resultsForControl[index];

        if (!result) {
          return {
            id: `${control.controlId}-${prompt.id}`,
            controlId: control.controlId,
            designElementId: prompt.id,
            status: 'error',
            Answer_Quality: 'NEEDS_REVIEW',
            Answer: 'NO',
            Question: prompt.question,
            SubQuestion: prompt.subQuestion,
            MainQuestion: mainQuestion,
            Answer_Source: '',
            Summary: 'Missing response from LLM analysis.',
            Reference: '',
            evidence: []
          };
        }

        try {
          const cleanAnswer = (result.answer || "").trim();
          if (!cleanAnswer) {
            return {
              id: `${control.controlId}-${prompt.id}`,
              controlId: control.controlId,
              designElementId: prompt.id,
              status: 'error',
              Answer_Quality: 'NEEDS_REVIEW',
              Answer: 'N/A',
              Question: prompt.question,
              SubQuestion: result.subQuestion,
              MainQuestion: mainQuestion,
              Answer_Source: 'N/A',
              Summary: 'API call failed or returned empty response.',
              Reference: 'N/A',
              evidence: []
            };
          }

          const strippedAnswer = cleanAnswer.replace(/^```json\s*/, '').replace(/```\s*$/, '');
          let answerObj = JSON.parse(strippedAnswer);

          if (Array.isArray(answerObj)) {
            if (answerObj.length > 0) {
              answerObj = answerObj[0];
            } else {
              return {
                id: `${control.controlId}-${prompt.id}`,
                controlId: control.controlId,
                designElementId: prompt.id,
                status: 'error',
                Answer_Quality: 'NEEDS_REVIEW',
                Answer: 'N/A',
                Question: prompt.question,
                SubQuestion: result.subQuestion,
                MainQuestion: mainQuestion,
                Answer_Source: 'N/A',
                Summary: 'API call returned an empty array.',
                Reference: 'N/A',
                evidence: []
              };
            }
          }

          const mappedQuality = answerObj.Answer_Quality ?
            (answerObj.Answer_Quality.charAt(0).toUpperCase() +
              answerObj.Answer_Quality.slice(1).toLowerCase()) : 'Needs_Review';

          const mappedAnswer = answerObj.Answer ?
            (answerObj.Answer.charAt(0).toUpperCase() +
              answerObj.Answer.slice(1).toLowerCase()) : 'No';

          return {
            id: `${control.controlId}-${prompt.id}`,
            controlId: control.controlId,
            designElementId: prompt.id,
            status: result.status,
            Answer_Quality: mappedQuality,
            Answer: mappedAnswer,
            Question: prompt.question,
            SubQuestion: result.subQuestion,
            MainQuestion: mainQuestion,
            Answer_Source: answerObj.Answer_Source || 'N/A',
            Summary: answerObj.Summary || strippedAnswer || 'N/A',
            Reference: answerObj.Reference || 'N/A',
            evidence: []
          };
        } catch (error) {
          console.error(`Error parsing result for ${prompt.id}:`, error);
          return {
            id: `${control.controlId}-${prompt.id}`,
            controlId: control.controlId,
            designElementId: prompt.id,
            status: 'error',
            Answer_Quality: 'NEEDS_REVIEW',
            Answer: 'NO',
            Question: prompt.question,
            SubQuestion: prompt.subQuestion,
            MainQuestion: mainQuestion,
            Answer_Source: 'N/A',
            Summary: 'Failed to parse LLM response.',
            Reference: 'N/A',
            evidence: []
          };
        }
      });
    });

    const processingTime = Date.now() - startTime;

    // Update job with completed result
    await jobsCollection.updateOne(
      { UUID: jobUUID },
      { 
        $set: { 
          status: 'Completed',
          updatedAt: new Date(),
          result: {
            report: reportResults,
            totalFiles: zipResult.totalFiles,
            totalControls: zipResult.totalControls,
            processingTime
          }
        }
      }
    );

    console.log(`Job ${jobUUID} completed successfully`);

  } catch (error) {
    console.error(`Error processing job ${jobUUID}:`, error);
    
    // Update job status to failed
    await jobsCollection.updateOne(
      { UUID: jobUUID },
      { 
        $set: { 
          status: 'Failed',
          updatedAt: new Date(),
          result: { 
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    );
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../lib/mongodb';
import { Job, CreateJobRequest } from '../../types/job';
import { processZipFile } from '../../services/ZipfileProcessor';
import { getDesignElementsByCID, loadDomainList } from '../../services/promptServiceForVendor';
import { getLLMEvidenceWithProgress, ProcessingProgress } from '../../services/evidenceService';
import { getDomainIdsFromQuestionnaire } from '../../services/questionnaireService';

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

    // Create job document in MongoDB
    const db = await getDatabase();
    const jobsCollection = db.collection<Job>('jobs');

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
  const db = await getDatabase();
  const jobsCollection = db.collection<Job>('jobs');

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

    // Convert base64 back to File object
    const base64Data = zipFileBase64.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    const zipFile = new File([binaryData], 'upload.zip', { type: 'application/zip' });

    // Process the ZIP file
    const zipResult = await processZipFile(zipFile);
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

    // Process with LLM using progress tracking
    const onProgress = (progress: ProcessingProgress) => {
      console.log('Progress update:', progress);
    };

    const batchResults = await getLLMEvidenceWithProgress(controlPromptList, onProgress);

    // Transform batch results into report format
    const reportResults = controlPromptList.flatMap(control => {
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

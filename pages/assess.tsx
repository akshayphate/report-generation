/**
* @file assess.tsx
* @description 
* @author Akshay Phate
* @created July 26, 2025
*/
import React, { useState, useEffect } from "react"
import { processZipFile, ProcessedZipResult, ControlEvidence } from "../services/ZipfileProcessor";
import { getDesignElementsByCID, loadDomainList } from '../services/promptServiceForVendor'
import { getLLMEvidenceWithProgress, ProcessingProgress, type ApiResponse } from "../services/evidenceService";
import { getDomainIdsFromQuestionnaire } from '../services/questionnaireService'
import styles from "../styles/assesment.module.css";
import { Upload } from "@progress/kendo-react-upload";
import { Button } from "@progress/kendo-react-buttons";
import { ZipContentsDisplay } from "../components/ZipContentsDisplay";
import { ReportDisplay } from "../components/ReportDisplay";
import ProgressDisplay from "../components/ProgressDisplay";
import ProgressBar from 'react-bootstrap/ProgressBar';
import "@progress/kendo-theme-default/dist/all.css";
import { useTimeoutPrevention } from "../hooks/useTimeoutPrevention";
import { TimeoutPreventionModal } from "../components/TimeoutPreventionModal";
// import { Protected } from '@ctip/cip-framework-client';
// import RestrictAccess from '../components/RestrictAcess';



interface EnhancedReportItem {
    id: string;
    controlId: string;
    designElementId: string;
    status: 'success' | 'error';
    processingError?: string;
    evidence?: string[];
    Answer_Quality: 'Adequate' | 'Inadequate' | 'Needs_Review';
    Answer: 'Yes' | 'No' | 'N/A';
    Question: string;
    SubQuestion?: string;
    Answer_Source: string;
    Summary: string;
    Reference: string;
    MainQuestion?: string;
}


interface FileContent {
    fileName: string;
    type: string;
    fullPath?: string;
}


interface ProcessedFolder {
    name: string;
    contents: FileContent[];
}


interface ControlResult {
    controlId: string;
    isLoading: boolean;
    error?: string;
    results: ApiResponse[];
}


type ControlPromptList = Array<{
    controlId: string;
    prompts: Array<{ id: string; prompt: string; question: string; subQuestion: string; }>;
    files: File[];
}>;


const FullVendorAnalysis: React.FC = () => {
    const [currentZipFile, setCurrentZipFile] = useState<File | null>(null);
    const [zipUploaded, setZipUploaded] = useState(false);
    const [zipContents, setZipContents] = useState<{ folders: ProcessedFolder[] }>({ folders: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<EnhancedReportItem[]>([]);
    const [showReport, setShowReport] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
    const [controlResults, setControlResults] = useState<Record<string, ControlResult>>({});
    const [isViewingContents, setIsViewingContents] = useState(false);
    const [showZipContents, setShowZipContents] = useState(false);
    const [questionnaireFile, setQuestionnaireFile] = useState<{ name: string; type?: string; size?: number } | null>(null);
    const [processedZipData, setProcessedZipData] = useState<ProcessedZipResult | null>(null);
    const [isProcessingAllowed, setIsProcessingAllowed] = useState(false);
    const [analyzingProgress, setAnalyzingProgress] = useState<number>(0);
    const [totalSteps, setTotalSteps] = useState<number>(0);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [uploadConfirmation, setUploadConfirmation] = useState<string | null>(null);
    const roles = ['tprss-inquire'];

    // Timeout prevention hook - shows modal every 14 minutes to prevent 15-minute timeout
    const {
        showModal: showTimeoutModal,
        countdown: timeoutCountdown,
        handleUserConfirmation: handleTimeoutConfirmation,
        closeModal: closeTimeoutModal,
        simulateActivity
    } = useTimeoutPrevention({
        intervalMinutes: 1, // Show modal every 1 minute for testing (change back to 14 for production)
        countdownSeconds: 30, // Give user 30 seconds to respond
        enabled: true // Always enabled to prevent timeouts
    });


    const handleUploadSuccess = (event: any) => {
        const files = event.affectedFiles || [];
        if (files.length === 0) {
            setZipUploaded(false);
            setZipContents({ folders: [] });
            setCurrentZipFile(null);
            return;
        }


        const zipFile = files[0].getRawFile();
        if (!zipFile) {
            setZipUploaded(false);
            setZipContents({ folders: [] });
            setCurrentZipFile(null);
            return;
        }

        if (!zipFile.name.toLowerCase().endsWith('.zip')) {
            setZipUploaded(false);
            setZipContents({ folders: [] });
            setCurrentZipFile(null);
            setError('Invalid file type. Please upload a ZIP file.');
            return;
        }


        setCurrentZipFile(zipFile);
        setZipUploaded(true);
        setShowZipContents(false);
        setIsViewingContents(false);
        setError(null);
        setUploadConfirmation(`✅ File "${zipFile.name}" uploaded successfully!`);

        // Simulate activity to prevent timeout
        simulateActivity();

        handleZipFileChange(zipFile);


    };


    const handleZipFileChange = async (zipFile: File) => {
        try {
            const result = await processZipFile(zipFile);
            setProcessedZipData(result);


            console.log('ZIP processing result:', {
                controlsCount: result.controls?.length || 0,
                totalFiles: result.totalFiles,
                totalControls: result.totalControls,
                errors: result.errors
            });


            if (result.controls) {
                console.log('Found controls:', result.controls.map(control => ({
                    id: control.cid,
                    evidenceCount: control.evidences?.length || 0,
                    evidenceTypes: control.evidences?.map(e => e.type)
                })));


            }


            // Display all contents without validation
            const processedFolders: ProcessedFolder[] = [];


            // Process structured folders
            if (result.controls && result.controls.length > 0) {
                console.log('Processing structured folders for display...');
                const folderResults = result.controls.map(control => {
                    const folderContent = {
                        name: control.controlName,
                        contents: control.evidences
                            .map(file => ({
                                fileName: file.name,
                                type: file.type,
                                size: file.size || 0,  // Add size property
                            }))
                    };
                    console.log(`Folder "${folderContent.name}" contains ${folderContent.contents.length} files`);
                    return folderContent;
                });
                processedFolders.push(...folderResults);
            } else {
                console.log('No structured folders found in the ZIP for display');
            }


            // Sort folders alphabetically
            processedFolders.sort((a, b) => a.name.localeCompare(b.name));


            // Sort files within each folder
            processedFolders.forEach(folder => {
                folder.contents.sort((a, b) => a.fileName.localeCompare(b.fileName));
            });


            console.log('Final processed structure:', {
                totalFolders: processedFolders.length,
                folders: processedFolders.map(f => ({
                    name: f.name,
                    fileCount: f.contents.length,
                    files: f.contents.map(c => c.fileName)
                }))
            });


            setZipContents({ folders: processedFolders });

            // Set questionnaire file with additional properties
            if (result.questionnaireFile) {
                const fileType = getMimeTypeForDisplay(result.questionnaireFile.name);
                const fileSize = result.questionnaireFile.content.byteLength;
                setQuestionnaireFile({
                    name: result.questionnaireFile.name,
                    type: fileType,
                    size: fileSize
                });
            } else {
                setQuestionnaireFile(null);
            }

            setError(null);


            console.log('ZIP contents successfully set to state');
        } catch (err) {
            console.error('Error processing ZIP file:', err);
            if (err instanceof Error) {
                console.error('Error details:', {
                    message: err.message,
                    stack: err.stack
                });
            }
            setError("Failed to read ZIP file. Please ensure it's a valid ZIP archive.");
            setZipUploaded(false);
            setZipContents({ folders: [] });
            setShowReport(false);
            setProcessedZipData(null);
        }
    };


    const handleProceedWithLargeFiles = () => {
        setIsProcessingAllowed(true);
        setShowZipContents(false); // Hide the ZIP contents view
        // If we were about to generate a report when we found large files, do it now
        if (loading) {
            handleGenerateReport();
        }
    };
    // Function to update progress based on processing steps
    const updateProgress = (current: number, total: number) => {
        setCurrentStep(current);
        setTotalSteps(total);
        const progressPercentage = Math.min(Math.round((current / total) * 100), 100);
        setAnalyzingProgress(progressPercentage);
    };


    // Reset progress when starting over or on component mount
    useEffect(() => {
        if (!loading) {
            setAnalyzingProgress(0);
            setCurrentStep(0);
            setTotalSteps(0);
            setStartTime(null);
            setElapsedTime(0);
        }
    }, [loading]);

    // Stopwatch effect
    useEffect(() => {
        let interval: NodeJS.Timeout;


        if (loading && startTime && !showReport) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 1000);
        }


        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [loading, startTime, showReport]);




    const handleGenerateReport = async () => {
        if (!currentZipFile || !processedZipData) return;


        // Start processing regardless of file size
        setLoading(true);
        setStartTime(Date.now());
        setError(null);
        setReport([]);
        setShowZipContents(false); // Hide zip contents view
        
        // Simulate activity to prevent timeout
        simulateActivity();
        try {
            const zipResult = processedZipData;
            console.log('✅ Using pre-processed zip data:', zipResult);



            // Get domain IDs from excel file if it exists
            //updateProgress(1, 5); // Step 1: Process questionnaire
            const domainIdsFromExcel = zipResult.questionnaireFile?.content
                ? await getDomainIdsFromQuestionnaire(zipResult.questionnaireFile.content)
                : null;



            if (domainIdsFromExcel) {
                console.log('Found domain IDs in Excel to filter against:', domainIdsFromExcel);
            }



            //updateProgress(2, 5); // Step 2: Load domain list
            const domainList = await loadDomainList();
            const mainQuestionMap = new Map(domainList.map(d => [d.Domain_Id, d.Question]));



            // Step 3: Prepare control prompts
            const controlPromptPreparationSteps = zipResult.controls.length;
            let currentControlStep = 0;



            const controlPromptList = (await Promise.all(
                zipResult.controls.map(async (controlGroup) => {
                    // Filter the domain IDs for this group against the ones from the Excel file
                    const validDomainIds = domainIdsFromExcel
                        ? controlGroup.domainIds.filter(id => domainIdsFromExcel.includes(id))
                        : controlGroup.domainIds;
                    console.log("Valid domain IDs for control group:", controlGroup.controlName, validDomainIds.toString);



                    if (validDomainIds.length === 0) {
                        //console.warn(`No valid domain IDs found for folder "${controlGroup.controlName}" after filtering.`);
                        // Add detailed logs for debugging the mismatch
                        if (domainIdsFromExcel) {
                            console.log(`DEBUG: IDs from domain_list.json for this folder:`, controlGroup.domainIds);
                            console.log(`DEBUG: IDs from Excel file being compared against:`, domainIdsFromExcel);
                            console.log(`DEBUG: The two lists above have no IDs in common.`);
                        }
                        return null; // Skip this control group
                    }



                    console.log(`Processing valid Domain IDs for ${controlGroup.controlName}:`, validDomainIds);



                    // For each valid domain ID, get its design elements
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
                    currentControlStep++;
                    // updateProgress(2 + (currentControlStep / controlPromptPreparationSteps), 5);
                    return promptsForGroup;
                })
            )).flat().filter(Boolean) as ControlPromptList;



            console.log('✅ Control prompt list prepared:', controlPromptList);
            //updateProgress(3, 5); // Step 3 complete



            if (controlPromptList.length === 0) {
                setError('No valid controls found to process after filtering.');
                setLoading(false);
                return;
            }



            // Step 4: Process with LLM using progress tracking
            //updateProgress(4, 5);


            // Progress tracking callback
            const onProgress = (progress: ProcessingProgress) => {
                console.log('Progress update:', progress);
                setProcessingProgress(progress);
                // Update UI with real-time progress
                setAnalyzingProgress(Math.round((progress.completedControls / progress.totalControls) * 100));


                // Update current step display
                if (progress.currentControl) {
                    setCurrentStep(progress.completedControls + 1);
                    setTotalSteps(progress.totalControls);
                }
            };


            const batchResults = await getLLMEvidenceWithProgress(controlPromptList, onProgress);
            console.log('✅ Sequential processing complete:', batchResults);



            // Step 5: Format results
            //updateProgress(4.5, 5);
            // Transform batch results into report format
            const reportResults: EnhancedReportItem[] = controlPromptList.flatMap(control => {
                const resultsForControl = batchResults[control.controlId] || [];
                console.log(`Processing results for control ${control.controlId}:`, resultsForControl);
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
                            // Handle cases where the API returns an empty or null response
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
                        //console.log("stripped answer is : ", strippedAnswer)
                        var answerObj = JSON.parse(strippedAnswer);
                        // if answerObj is an array then take the first element
                        if (Array.isArray(answerObj)) {
                            if (answerObj.length > 0) {
                                // console.log(`Answer object is an array, taking first element for prompt ${prompt.id} in control ${control.controlId}`);
                                answerObj = answerObj[0];
                            } else {
                                //console.warn(`Answer object is an empty array for prompt ${prompt.id} in control ${control.controlId}`);
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



                        //console.log(`Parsed answer object for prompt ${prompt.id} in control ${control.controlId}:`, answerObj);


                        if (!answerObj) {
                            console.log(`No answer object found for prompt ${prompt.id} in control ${control.controlId}`);
                            //console.log("stripped answer is : ", strippedAnswer)
                        }
                        // Format the values to proper case
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



            console.log('✅ Report results prepared:', reportResults);
            //updateProgress(5, 5);
            setReport(reportResults);
            setShowReport(true);
        } catch (error) {
            console.error('Error generating report:', error);
            setError('Failed to generate report. Please try again.');
            setLoading(false);
        }
    };



    const downloadExcel = () => {
        if (!report || report.length === 0) return;



        const headers = "MainQuestion,Question,SubQuestion,Answer,Answer_Quality,Answer_Source,Summary,Reference\n";
        const rows = report.map(item => {
            const rowData = [
                item.MainQuestion,
                item.Question,
                item.SubQuestion,
                item.Answer,
                item.Answer_Quality,
                item.Answer_Source,
                item.Summary,
                item.Reference
            ];
            const row = rowData.map(cell => `"${(cell || 'N/A').toString().replace(/"/g, '""')}"`);
            return row.join(',');
        }).join('\n');



        const csvContent = headers + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'assessment_report.csv';
        link.click();
    };



    const startOver = () => {
        setZipUploaded(false);
        setZipContents({ folders: [] });
        setLoading(false);
        setError(null);
        setShowReport(false);
        setShowZipContents(false);
        setReport([]);
        setControlResults({});
        setCurrentZipFile(null);
        setProcessedZipData(null);
        setQuestionnaireFile(null);
        setIsProcessingAllowed(false); // Reset the processing permission
        setUploadConfirmation(null);
        setAnalyzingProgress(0);
        setTotalSteps(0);
        setCurrentStep(0);
        setProcessingProgress(null);
        setStartTime(null);
        setElapsedTime(0);
    };



    const handleViewZipContents = async () => {
        setIsViewingContents(true);
        setShowZipContents(true);
        setShowReport(false);



        // Reset these states to ensure buttons are enabled when ZIP contents are closed
        setLoading(false);
        setIsProcessingAllowed(false);
    };



    // Update the ZipContentsDisplay onClose handler
    const handleCloseZipContents = () => {
        setShowZipContents(false);
        setIsViewingContents(false);
        setIsProcessingAllowed(false);
        // Reset loading state to ensure Generate Report button is enabled
        setLoading(false);
    };



    // Progress bar component
    const renderProgressBar = () => {
        return (
            <div className={styles.progressContainer} aria-live="polite">
                <div className={styles.progressCard}>
                    <div className={styles.progressIconContainer}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#D41C2C"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <h3>Analyzing Evidence</h3>
                        <p className={styles.progressText}>
                            AI is processing your uploaded evidence files...
                        </p>
                    </div>



                    <ProgressBar
                        now={analyzingProgress}
                        className={styles.progressBar}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={analyzingProgress}
                    />
                    <p className={styles.progressPercentage}>
                        {analyzingProgress}% Complete
                    </p>



                    <div className={styles.progressDetails}>
                        <small>
                            Processing {processedZipData?.totalFiles || 0} files for compliance validation...
                        </small>
                    </div>
                </div>
            </div>
        );
    };



    // Helper function to get a display-friendly mime type for Excel files
    const getMimeTypeForDisplay = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'xlsx':
                return 'Excel Spreadsheet';
            case 'xls':
                return 'Excel Spreadsheet (Legacy)';
            case 'xlsm':
                return 'Excel Spreadsheet (Macro-enabled)';
            case 'pdf':
                return 'PDF Document';
            case 'jpg':
            case 'jpeg':
                return 'JPEG Image';
            case 'png':
                return 'PNG Image';
            case 'txt':
                return 'Text Document';
            case 'doc':
            case 'docx':
                return 'Word Document';
            default:
                return 'Unknown File Type';
        }
    };
    return (
        // <Protected withRole={roles} Denied={() => <RestrictAccess />}>
            <div className={`${styles.root} ${styles.container}`}>
                {/* <header className={styles.header}>
            <h1 className={styles.pageTitle}>Third Party Risk Summarization Service</h1>
            <p className={styles.sectionHeading}>Automated Evidence Review for Third Party Controls</p>
        </header> */}



                {!showReport ? (
                    <>
                        {!loading && (
                            <>
                                <div className={styles.instructions}>
                                    <h2 className={styles.instructionsTitle}>How to Prepare Your Upload</h2>
                                    <ol className={styles.instructionsList}>
                                        <li>
                                            <strong>Gather Evidences:</strong> Collect all relevant evidence documents for each control under various domain. Accepted formats are pdf, doc and common image types (PNG, JPG).
                                        </li>
                                        <li>
                                            <strong>Prepare The Upload:</strong> Create a top level folder named on vendor. Place vendor questionnaire here. Create separate folders named on each domain (e.g., "Business continuity", "Threat and vulnerability Management") and place corresponding evidences in domain folders.
                                        </li>
                                        <li>
                                            <strong>Compress:</strong> Zip the folder structure and zipped file is the upload for full vendor assessment.
                                        </li>
                                    </ol>
                                </div>


                                <div className={styles.uploadSection}>
                                    <Upload
                                        restrictions={{
                                            allowedExtensions: ['.zip'],
                                            maxFileSize: 100000000 // 100MB
                                        }}
                                        onAdd={handleUploadSuccess}
                                        saveUrl={''}
                                        autoUpload={false}
                                        multiple={false}
                                    />
                                </div>


                                {error && (
                                    <div className={styles.alertDanger} role="alert">
                                        {error}
                                    </div>
                                )}


                                {uploadConfirmation && (
                                    <div className={styles.uploadConfirmation} role="alert">
                                        {uploadConfirmation}
                                    </div>
                                )}


                                <div className={styles.actionButtons}>
                                    <Button
                                        disabled={!zipUploaded || loading}
                                        onClick={handleGenerateReport}
                                        themeColor={'primary'}
                                    >
                                        {loading ? 'Processing...' : 'Generate Report'}
                                    </Button>
                                    {zipUploaded && (
                                        <Button
                                            disabled={loading || isViewingContents}
                                            onClick={handleViewZipContents}
                                            themeColor={'info'}
                                            fillMode="outline"
                                        >
                                            {isViewingContents ? 'Loading Contents...' : 'View ZIP Contents'}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <div className={styles.actionButtons}>
                            <Button
                                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                                themeColor={'secondary'}
                            >
                                {viewMode === 'table' ? 'Card View' : 'Table View'}
                            </Button>
                            <Button onClick={downloadExcel} themeColor={'success'}>
                                Download CSV
                            </Button>
                            <Button onClick={startOver} themeColor={'error'} fillMode="outline">
                                Start Over
                            </Button>
                        </div>
                    </>
                )}



                {/* Enhanced Progress Display */}
                {loading && !showReport && processingProgress && (
                    <ProgressDisplay
                        progress={processingProgress}
                        isVisible={true}
                        elapsedTime={elapsedTime}
                    />
                )}


                {/* Fallback progress bar for initial loading */}
                {/* {loading && !showReport && !processingProgress && renderProgressBar()} */}



                {/* ZIP Contents Display */}
                {showZipContents && (
                    <>
                        <ZipContentsDisplay
                            folders={zipContents.folders}
                            onClose={handleCloseZipContents}
                            onProceed={handleProceedWithLargeFiles}
                            questionnaireFile={questionnaireFile}
                        />
                    </>
                )}



                {/* Report Display */}
                {showReport && (
                    <ReportDisplay
                        results={report}
                        viewMode={viewMode}
                        totalTime={elapsedTime}
                    />
                )}

                {/* Timeout Prevention Modal */}
                <TimeoutPreventionModal
                    isOpen={showTimeoutModal}
                    onConfirm={handleTimeoutConfirmation}
                    onClose={closeTimeoutModal}
                    countdown={timeoutCountdown}
                />
            </div>
        // </Protected>
    );
};



export default FullVendorAnalysis;
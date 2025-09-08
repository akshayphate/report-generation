/**
* @file assess.tsx
* @description Refactored vendor assessment page with asynchronous job processing
* @author Akshay Phate
* @created July 26, 2025
*/
import React, { useState } from "react"
import styles from "../styles/assesment.module.css";
import { Upload } from "@progress/kendo-react-upload";
import { Button } from "@progress/kendo-react-buttons";
import "@progress/kendo-theme-default/dist/all.css";

// Mock user context - replace with actual context when available
const mockUser = {
  firstName: 'John',
  lastName: 'Doe',
  userName: 'john.doe@example.com'
};

const FullVendorAnalysis: React.FC = () => {
    const [currentZipFile, setCurrentZipFile] = useState<File | null>(null);
    const [zipUploaded, setZipUploaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploadConfirmation, setUploadConfirmation] = useState<string | null>(null);

    const handleUploadSuccess = (event: any) => {
        const files = event.affectedFiles || [];
        if (files.length === 0) {
            setZipUploaded(false);
            setCurrentZipFile(null);
            setUploadConfirmation(null);
            return;
        }

        const zipFile = files[0].getRawFile();
        if (!zipFile) {
            setZipUploaded(false);
            setCurrentZipFile(null);
            setUploadConfirmation(null);
            return;
        }

        if (!zipFile.name.toLowerCase().endsWith('.zip')) {
            setZipUploaded(false);
            setCurrentZipFile(null);
            setError('Invalid file type. Please upload a ZIP file.');
            setUploadConfirmation(null);
            return;
        }

        setCurrentZipFile(zipFile);
        setZipUploaded(true);
        setError(null);
        setSuccess(null);
        setUploadConfirmation(`✅ File "${zipFile.name}" uploaded successfully!`);
    };

    const handleSubmitJob = async () => {
        if (!currentZipFile) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Convert file to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(currentZipFile);
            });

            // Submit job to backend
            const response = await fetch('/api/processZip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: mockUser.userName,
                    userName: `${mockUser.firstName} ${mockUser.lastName}`,
                    zipFile: base64,
                    zipFileName: currentZipFile.name,
                    zipFileSize: currentZipFile.size
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit job');
            }

            const result = await response.json();
            setSuccess(`Job submitted successfully! Job ID: ${result.jobUUID}`);
            setUploadConfirmation(null);
            
            // Clear the form
            setCurrentZipFile(null);
            setZipUploaded(false);

        } catch (err) {
            console.error('Error submitting job:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit job');
        } finally {
            setLoading(false);
        }
    };

    const startOver = () => {
        setZipUploaded(false);
        setLoading(false);
        setError(null);
        setSuccess(null);
        setUploadConfirmation(null);
        setCurrentZipFile(null);
    };

    const navigateToJobs = () => {
        window.location.href = '/jobs';
    };

    return (
        <div className={`${styles.root} ${styles.container}`}>
            {!success ? (
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
                            onClick={handleSubmitJob}
                            themeColor={'primary'}
                        >
                            {loading ? 'Submitting...' : 'Submit for Assessment'}
                        </Button>
                        {zipUploaded && (
                            <Button
                                onClick={startOver}
                                themeColor={'error'}
                                fillMode="outline"
                            >
                                Start Over
                            </Button>
                        )}
                    </div>
                </>
            ) : (
                <div className={styles.successContainer}>
                    <div className={styles.successMessage}>
                        <h2>✅ Job Submitted Successfully!</h2>
                        <p>{success}</p>
                        <p>Your assessment is now being processed in the background. You can track its progress and view results when completed.</p>
                    </div>
                    
                    <div className={styles.actionButtons}>
                        <Button
                            onClick={navigateToJobs}
                            themeColor={'primary'}
                        >
                            View My Jobs
                        </Button>
                        <Button
                            onClick={startOver}
                            themeColor={'secondary'}
                            fillMode="outline"
                        >
                            Submit Another Assessment
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FullVendorAnalysis;
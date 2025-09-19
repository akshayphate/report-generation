import React, { useState } from 'react';
import styles from '../styles/UploadFile.module.css';


interface UploadFileProps {
    name: string;
    width?: string; // Optional width override
    height?: string; // Optional height override
    multiple?: boolean; // Allow multiple file selection
    onFileSelect?: (files: File | File[] | null) => void; // Callback to notify parent about file selection
}


const UploadFile: React.FC<UploadFileProps> = ({ name, width, height, multiple = false, onFileSelect }) => {
    const [selectedFiles, setSelectedFiles] = useState<File | File[] | null>(null);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const selected = multiple ? Array.from(files) : files[0];
            setSelectedFiles(selected);
            if (onFileSelect) {
                onFileSelect(selected); // Notify parent component about the selected file(s)
            }
        }
    };


    return (
        <div className={styles.container}>
            <label
                htmlFor="file-upload"
                className={styles.uploadButton}
                style={{ width, height }} // Inline styles for optional overrides
            >
                
                {selectedFiles
                    ? multiple
                        ? `${(selectedFiles as File[]).length} Files Selected`
                        : 'File Selected'
                    : name}
            </label>
            <input
                id="file-upload"
                type="file"
                className={styles.fileInput}
                onChange={handleFileChange}
                multiple={multiple} // Enable or disable multiple file selection
            />
        </div>
    );
};


export default UploadFile;
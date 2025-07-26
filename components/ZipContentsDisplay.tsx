/**
* @file ZipContentsDisplay.tsx
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
* @updated July 27, 2025 - Added better file size formatting and UI improvements
*/

import React, { Component } from 'react';
import styles from '../styles/assesment.module.css';
import { WarningModal } from './WarningModal';

interface FileContent {
    fileName: string;
    type: string;
    extension?: string;
    fullPath?: string;
    size?: number;
}

interface ProcessedFolder {
    name: string;
    contents: FileContent[];
}

interface ZipContentsDisplayProps {
    folders: ProcessedFolder[];
    onClose: () => void;
    onProceed: () => void;
    questionnaireFile: { name: string; type?: string; size?: number } | null;
}

interface FolderRowProps {
    folder: ProcessedFolder;
}

interface FolderRowState {
    isOpen: boolean;
}

class FolderRow extends Component<FolderRowProps, FolderRowState> {
    constructor(props: FolderRowProps) {
        super(props);
        this.state = {
            isOpen: false
        };
    }

    formatFileSize = (bytes?: number, forceKB: boolean = false): string => {
        if (!bytes) return 'N/A';
        
        if (forceKB || bytes < 1024 * 1024) {
            // Show in KB if forced or if size is less than 1MB
            const kb = (bytes / 1024).toFixed(1);
            return `${kb} KB`;
        } else {
            // Show in MB for larger files
            const mb = (bytes / (1024 * 1024)).toFixed(1);
            return `${mb} MB`;
        }
    };

    toggleOpen = () => {
        this.setState(prevState => ({ isOpen: !prevState.isOpen }));
    };

    render() {
        const { folder } = this.props;
        const { isOpen } = this.state;

        return (
            <React.Fragment>
                <tr className={styles['zip-folder-row']} onClick={this.toggleOpen}>
                    <td colSpan={3}>
                        <span className={styles['zip-folder-icon']}>
                            {isOpen ? '📂' : '📁'}
                        </span>
                        {folder.name} ({folder.contents.length} files)
                    </td>
                </tr>
                {isOpen && folder.contents.map((file, index) => (
                    <tr key={index} className={styles['zip-file-row']}>
                        <td>
                            <span className={styles['zip-file-icon']}>📄</span>
                            {file.fileName}
                        </td>
                        <td>{file.type}</td>
                        <td>{this.formatFileSize(file.size)}</td>
                    </tr>
                ))}
            </React.Fragment>
        );
    }
}

interface ZipContentsDisplayState {
    showWarning: boolean;
    largeFiles: Array<{ name: string; size: number }>;
    showContents: boolean;
}

export class ZipContentsDisplay extends Component<ZipContentsDisplayProps, ZipContentsDisplayState> {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

    constructor(props: ZipContentsDisplayProps) {
        super(props);
        this.state = {
            showWarning: false,
            largeFiles: [],
            showContents: false
        };
    }

    componentDidMount() {
        this.checkLargeFiles();
        // Auto-show contents after a short delay for better UX
        setTimeout(() => {
            this.setState({ showContents: true });
        }, 50);
    }

    componentDidUpdate(prevProps: ZipContentsDisplayProps) {
        if (prevProps.folders !== this.props.folders) {
            this.checkLargeFiles();
        }
    }

    formatFileSize = (bytes?: number, forceKB: boolean = false): string => {
        if (!bytes) return 'N/A';
        
        if (forceKB || bytes < 1024 * 1024) {
            // Show in KB if forced or if size is less than 1MB
            const kb = (bytes / 1024).toFixed(1);
            return `${kb} KB`;
        } else {
            // Show in MB for larger files
            const mb = (bytes / (1024 * 1024)).toFixed(1);
            return `${mb} MB`;
        }
    };

    checkLargeFiles = () => {
        const oversizedFiles = this.props.folders.flatMap(folder =>
            folder.contents
                .filter(file => file.size && file.size > this.MAX_FILE_SIZE)
                .map(file => ({
                    name: `${folder.name}/${file.fileName}`,
                    size: file.size!
                }))
        );

        console.log('Large files found:', oversizedFiles);
        if (oversizedFiles.length > 0) {
            this.setState({
                largeFiles: oversizedFiles,
                showWarning: true
            });
        }
    };

    handleProceed = () => {
        this.setState({ showWarning: false });
        this.props.onProceed();
    };

    handleWarningClose = () => {
        this.setState({ showWarning: false });
    };

    render() {
        const { folders, onClose, questionnaireFile } = this.props;
        const { showWarning, largeFiles, showContents } = this.state;

        return (
            <div className={`${styles['zip-contents-backdrop']} ${showContents ? styles.show : ''}`}>
                <div className={styles['zip-contents-modal']} onClick={(e) => e.stopPropagation()}>
                    <div className={styles['zip-contents-header']}>
                        <h2>ZIP Contents</h2>
                        <div className={styles['zip-actions']}>
                            <button 
                                className={styles['upload-new-btn']}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                            >
                                Upload Different File
                            </button>
                            <button 
                                className={styles['close-btn']}
                                onClick={onClose}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                    </div>

                    {questionnaireFile && (
                        <div className={styles['questionnaire-section']}>
                            <h4>Questionnaire File</h4>
                            <div className={styles['file-info']}>
                                <span className={styles['file-icon']}>📊</span>
                                <div className={styles['file-details']}>
                                    <div className={styles['file-name']}>
                                        {questionnaireFile.name}
                                    </div>
                                    <div className={styles['file-meta']}>
                                        <span>{questionnaireFile.type || 'Unknown type'}</span>
                                        <span>•</span>
                                        <span>{this.formatFileSize(questionnaireFile.size, true)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles['contents-section']}>
                        <h4>Evidence Files</h4>
                        {folders.length > 0 ? (
                            <div className={styles['zip-contents-table-container']}>
                                <table className={styles['zip-contents-table']}>
                                    <thead>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Type</th>
                                            <th>Size</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {folders.map((folder) => (
                                            <FolderRow key={folder.name} folder={folder} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className={styles['no-files']}>
                                <p>No valid folders or files to display.</p>
                            </div>
                        )}
                    </div>

                    {/* <div className={styles['zip-contents-footer']}>
                        <button 
                            className={styles['proceed-btn']}
                            onClick={this.handleProceed}
                            disabled={folders.length === 0}
                        >
                            Process Files
                        </button>
                    </div> */}

                    {showWarning && (
                        <WarningModal
                            isOpen={true}
                            onClose={this.handleWarningClose}
                            onProceed={this.handleProceed}
                            largeFiles={largeFiles}
                        />
                    )}
                </div>
            </div>
        );
    }
}

export default ZipContentsDisplay;

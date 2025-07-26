/**
 * @file ProgressDisplay.tsx
 * @description 
 * @author Damodar Perumalla
 * @created July 22, 2025
 */


import React from 'react';


interface ProcessingProgress {
    phase: 'zip_processing' | 'llm_processing' | 'complete';
    current: number;
    total: number;
    currentControl?: string;
}


interface ProgressDisplayProps {
    progress: ProcessingProgress;
}


export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ progress }) => {
    return (
        <div className="mt-4">
            <div className="card">
                <div className="card-body">
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold">
                                {progress.phase === 'zip_processing' && 'Extracting ZIP contents...'}
                                {progress.phase === 'llm_processing' && 'AI Analysis in Progress...'}
                                {progress.phase === 'complete' && 'Processing Complete'}
                            </span>
                            <span className="text-muted">
                                {progress.current}/{progress.total}
                            </span>
                        </div>
                        <div className="progress">
                            <div
                                className="progress-bar progress-bar-striped progress-bar-animated"
                                role="progressbar"
                                style={{
                                    width: `${(progress.current / progress.total) * 100}%`
                                }}
                            ></div>
                        </div>
                    </div>
                    {progress.currentControl && (
                        <small className="text-muted">{progress.currentControl}</small>
                    )}
                </div>
            </div>
        </div>
    );
};
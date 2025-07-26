/**
* @file ReportDisplay.tsx
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/


import styles from "../styles/assesment.module.css";
import React, { useState, useEffect } from 'react';

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
    DesignElement?: string;  // Added the new field
    Answer_Source: string;
    Summary: string;
    Reference: string;
    MainQuestion?: string;
}


interface ReportDisplayProps {
    results: EnhancedReportItem[];
    viewMode: 'table' | 'card';
    totalTime?: number; // New prop for total time in milliseconds
}


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ results, viewMode, totalTime }) => {
    
    // Format total time for display
    const formatTotalTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    if (!results || results.length === 0) {
        return (
            <div className={styles['results-container']}>
                <div className={styles['results-header']}>
                    <h2>Generated Report</h2>
                    {totalTime && (
                        <div className={styles['total-time']}>
                            ⏱️ Total Time: {formatTotalTime(totalTime)}
                        </div>
                    )}
                </div>
                <div className={styles['empty-state']}>
                    <p>No assessment results available. Please upload evidence files and generate a report.</p>
                </div>
            </div>
        );
    }


    // Function to convert values to title case (camelcase)
    const formatValue = (value: string): string => {
        if (!value) return 'N/A';
        // Handle special case for N/A
        if (value.toUpperCase() === 'N/A') return 'N/A';
        // For other values, convert to title case
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    };


    const getQualityClass = (quality: string) => {
        switch (quality.toUpperCase()) {
            case 'ADEQUATE':
                return styles.adequate;
            case 'INADEQUATE':
                return styles.inadequate;
            case 'NEEDS_REVIEW':
                return styles.needsReview;
            default:
                return '';
        }
    };


    const renderReportCard = (item: EnhancedReportItem) => (
        <div key={item.id} className={styles['report-card']}>
            <div className={styles['report-card-content']}>
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Control</div>
                    <div className={`${styles['field-value']} ${styles.subQuestion}`}>
                        {item.DesignElement || item.SubQuestion || 'N/A'}
                    </div>
                </div>
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Answer</div>
                    <div className={`${styles['field-value']} ${styles[`answer-${item.Answer.toLowerCase()}`]}`}>
                        {formatValue(item.Answer)}
                    </div>
                </div>
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Answer Quality</div>
                    <div className={`${styles['field-value']} ${styles[`quality-${item.Answer_Quality.toLowerCase()}`]}`}>
                        {formatValue(item.Answer_Quality)}
                    </div>
                </div>
                
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Answer_Source</div>
                    <div className={styles['field-value']}>{item.Answer_Source || 'N/A'}</div>
                </div>
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Summary</div>
                    <div className={styles['field-value']}>{item.Summary || 'N/A'}</div>
                </div>               
                <div className={styles['report-field']}>
                    <div className={styles['field-label']}>Reference</div>
                    <div className={styles['field-value']}>{item.Reference || 'N/A'}</div>
                </div>
            </div>
        </div>
    );


    const renderTableView = () => (
        <div className={styles['table-container']}>
            <table className={styles['assessment-table']}>
                <thead>
                    <tr>
                        <th>Control</th>
                        <th>Answer</th>
                        <th>Answer Quality</th>
                        <th>Answer Source</th>
                        <th>Summary</th>
                        <th>Reference</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((item) => (
                        <tr key={item.id}>
                            <td className={styles.subQuestion}>
                                {item.DesignElement || item.SubQuestion || 'N/A'}
                            </td>
                            <td>
                                <span className={styles[`answer-${item.Answer.toLowerCase()}`]}>
                                    {formatValue(item.Answer)}
                                </span>
                            </td>
                            <td>
                                <span className={styles[`quality-${item.Answer_Quality.toLowerCase()}`]}>
                                    {formatValue(item.Answer_Quality)}
                                </span>
                            </td>
                            <td>{item.Answer_Source || 'N/A'}</td>
                            <td>{item.Summary || 'N/A'}</td>
                            <td>{item.Reference || 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );


    return (
        <div className={styles['results-container']}>
            <div className={styles['results-header']}>
                <h2>Generated Report</h2>
                {totalTime && (
                    <div className={styles['total-time']}>
                        ⏱️ Total Time: {formatTotalTime(totalTime)}
                    </div>
                )}
            </div>
            {viewMode === 'card' ?
                (<div className={styles['cards-view-container']}>{results.map(renderReportCard)}</div>) :
                renderTableView()
            }
        </div>
    );
};
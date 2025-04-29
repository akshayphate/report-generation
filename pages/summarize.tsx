import { useState, useRef } from 'react';
import styles from '../styles/Summarize.module.css';
import { ReportService } from '../services/reportService';
import { FileData, ReportItem } from '../types/report';

export default function Summarize() {
  const [questionnaire, setQuestionnaire] = useState<FileData | null>(null);
  const [evidence, setEvidence] = useState<FileData[]>([]);
  const [report, setReport] = useState<ReportItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionnaireRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useRef<HTMLInputElement>(null);

  const handleQuestionnaireUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQuestionnaire({
        name: e.target.files[0].name,
        file: e.target.files[0]
      });
      setError(null);
    }
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        file: file
      }));
      setEvidence(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const clearFiles = () => {
    setQuestionnaire(null);
    setEvidence([]);
    setError(null);
    if (questionnaireRef.current) questionnaireRef.current.value = '';
    if (evidenceRef.current) evidenceRef.current.value = '';
  };

  const startOver = () => {
    setShowReport(false);
    setReport([]);
    setError(null);
    clearFiles();
  };

  const generateReport = async () => {
    if (!questionnaire || evidence.length === 0) {
      setError('Please upload both questionnaire and evidence files');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await ReportService.generateReport(questionnaire, evidence);
      setReport(response.data);
      setShowReport(true);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <h1 className={styles.heading}>Third Party Risk Evaluation Service</h1>
        <div className={styles.uploadSection}>
          <div className={styles.uploadControls}>
            <div className={styles.uploadGroup}>
              <label className={styles.uploadLabel}>
                <span>Upload Questionnaire</span>
                <input
                  type="file"
                  ref={questionnaireRef}
                  onChange={handleQuestionnaireUpload}
                  accept=".pdf,.doc,.docx"
                />
                {questionnaire && <span className={styles.fileName}>{questionnaire.name}</span>}
              </label>
            </div>
            
            <div className={styles.uploadGroup}>
              <label className={styles.uploadLabel}>
                <span>Upload Evidence</span>
                <input
                  type="file"
                  ref={evidenceRef}
                  onChange={handleEvidenceUpload}
                  accept=".pdf,.doc,.docx"
                  multiple
                />
                {evidence.length > 0 && (
                  <span className={styles.fileCount}>{evidence.length} files selected</span>
                )}
              </label>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.actionButtons}>
            <button onClick={clearFiles} className={styles.clearButton}>
              Clear All
            </button>
            <button
              onClick={generateReport}
              disabled={!questionnaire || evidence.length === 0 || isGenerating}
              className={styles.generateButton}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <div className={styles.bottomSection}>
          <div className={styles.reportContainer}>
            <div className={styles.reportHeader}>
              <h2>Generated Report</h2>
              <button onClick={startOver} className={styles.startOverButton}>
                Start Over
              </button>
            </div>
            <div className={styles.reportContent}>
              {report.map((item, index) => (
                <div key={index} className={styles.reportItem}>
                  <h3 className={styles.prompt}>Q: {item.prompt}</h3>
                  <div className={styles.responseTable}>
                    <table>
                      <tbody>
                        <tr>
                          <td className={styles.label}>Answer:</td>
                          <td>{item.response.Answer}</td>
                        </tr>
                        <tr>
                          <td className={styles.label}>Quality:</td>
                          <td>
                            <span className={`${styles.quality} ${styles[item.response["Answer Quality"].toLowerCase()]}`}>
                              {item.response["Answer Quality"]}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className={styles.label}>Source:</td>
                          <td>{item.response["Answer Source"]}</td>
                        </tr>
                        <tr>
                          <td className={styles.label}>Summary:</td>
                          <td>{item.response.Summary}</td>
                        </tr>
                        <tr>
                          <td className={styles.label}>Reference:</td>
                          <td>{item.response.Reference}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
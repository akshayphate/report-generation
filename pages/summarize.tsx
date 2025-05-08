import { useState, useRef } from 'react';
import styles from '../styles/Summarize.module.css';
import { ReportService, ReportItem } from '../services/reportService';

export default function Summarize() {
  const [questionnaire, setQuestionnaire] = useState<File | null>(null);
  const [evidence, setEvidence] = useState<File[]>([]);
  const [report, setReport] = useState<ReportItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const questionnaireRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useRef<HTMLInputElement>(null);

  const handleQuestionnaireUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQuestionnaire(e.target.files[0]);
      setError(null);
    }
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEvidence(Array.from(e.target.files));
      setError(null);
    }
  };

  const clearFiles = () => {
    setQuestionnaire(null);
    setEvidence([]);
    if (questionnaireRef.current) questionnaireRef.current.value = '';
    if (evidenceRef.current) evidenceRef.current.value = '';
  };

  const startOver = () => {
    setReport(null);
    setShowReport(false);
    clearFiles();
    setError(null);
    setLoading(false);
  };

  const generateReport = async () => {
    if (!questionnaire || evidence.length === 0) {
      setError('Please upload both questionnaire and evidence files.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the report service to generate the report
      const { data } = await ReportService.generateReport(questionnaire, evidence);
      setReport(data);
      setShowReport(true);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!report) return;
    
    // Create a CSV string
    const headers = "Question,Answer,Quality,Source,Summary,Reference\n";
    const rows = report.map(item => {
      // Escape commas and quotes in fields
      const question = item.question.replace(/"/g, '""');
      const answer = item.answer.replace(/"/g, '""');
      const summary = item.summary.replace(/"/g, '""');
      const source = item.source.replace(/"/g, '""');
      const reference = item.reference.replace(/"/g, '""');
      
      return `"${question}","${answer}","${item.answerQuality}","${source}","${summary}","${reference}"`;
    }).join("\n");
    
    const csvContent = headers + rows;
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up download attributes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `risk-assessment-report-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'cards' ? 'table' : 'cards');
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.xlsb,.csv"
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
                  <span className={styles.fileCount}>{evidence.length} {evidence.length === 1 ? 'file' : 'files'} selected</span>
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
              disabled={!questionnaire || evidence.length === 0 || loading}
              className={styles.generateButton}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {showReport && report && (
        <div className={styles.bottomSection}>
          <div className={styles.reportContainer}>
            <div className={styles.reportHeader}>
              <h2>Generated Report</h2>
              <div className={styles.reportActions}>
                <button 
                  onClick={toggleViewMode} 
                  className={styles.viewModeButton}
                >
                  {viewMode === 'cards' ? 'Table View' : 'Card View'}
                </button>
                <button 
                  onClick={downloadExcel} 
                  className={styles.downloadButton}
                >
                  Download Excel
                </button>
                <button 
                  onClick={startOver} 
                  className={styles.startOverButton}
                >
                  Start Over
                </button>
              </div>
            </div>
            
            {viewMode === 'cards' ? (
              <div className={styles.reportContent}>
                {report.map((item, index) => (
                  <div key={index} className={styles.reportItem}>
                    <h3 className={styles.prompt}>Q: {item.question}</h3>
                    <div className={styles.responseTable}>
                      <table>
                        <tbody>
                          <tr>
                            <td className={styles.label}>Answer:</td>
                            <td>{item.answer}</td>
                          </tr>
                          <tr>
                            <td className={styles.label}>Quality:</td>
                            <td>
                              <span className={`${styles.quality} ${styles[item.answerQuality.toLowerCase()]}`}>
                                {item.answerQuality}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className={styles.label}>Source:</td>
                            <td>{item.source}</td>
                          </tr>
                          <tr>
                            <td className={styles.label}>Summary:</td>
                            <td>{item.summary}</td>
                          </tr>
                          <tr>
                            <td className={styles.label}>Reference:</td>
                            <td>{item.reference}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.tableView}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Answer</th>
                      <th>Quality</th>
                      <th>Source</th>
                      <th>Summary</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((item, index) => (
                      <tr key={index}>
                        <td>{item.question}</td>
                        <td>{item.answer}</td>
                        <td>
                          <span className={`${styles.quality} ${styles[item.answerQuality.toLowerCase()]}`}>
                            {item.answerQuality}
                          </span>
                        </td>
                        <td>{item.source}</td>
                        <td>{item.summary}</td>
                        <td>{item.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
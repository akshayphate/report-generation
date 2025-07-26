// chat.tsx
// src/components/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/Chat.module.css';
//import { Protected } from '@ctip/cip-framework-client';
import RestrictAccess from '../components/RestrictAccess';
import { getDesignElementsByCID, QuestionPrompt } from '../services/promptService';
import { processDesignElements } from '../services/designService';
import * as XLSX from 'xlsx';


interface Message {
  type: 'user' | 'bot';
  content: string;
}



export default function Chat() {
  const [controlId, setControlId] = useState<string | null>(null);
  const [idPrompts, setIdPrompts] = useState<QuestionPrompt[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: 'Welcome! Please enter the Control or Domain ID to begin.' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  const MAX_TOTAL_EVIDENCE_MB = 10;
  const roles = ['tprss-inquire'];


  // Auto-scroll
  useEffect(() => {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);



  const pushMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };


  const handleSelectAll = () => {
    if (selectedIds.length === idPrompts.length) {
      setSelectedIds([]);
    } else {
      const allIds = idPrompts.map(el => el.id);
      setSelectedIds(allIds);
    }



  }


  const handleDeselectAll = () => {
    setSelectedIds([]);
  };


  const handleStartOver = () => {
    setControlId(null);
    setIdPrompts([]);
    setEvidenceFiles([]);
    setMessages([{ type: 'bot', content: 'Welcome! Please enter the Control or Domain ID to begin.' }]);
    setIsProcessing(false);
    setSelectedIds([]);
    setSubmittedIds([]);
    setShowDropdown(false);
    setTableCols([]);
    setTableData([]);
  };



  // Submit Control ID
  const handleControlIdSubmit = async (cid: string) => {
    if (!cid.trim()) {
      pushMessage({ type: 'bot', content: 'Please enter a valid Control or Domain ID.' });
      return;
    }
    const upperCaseCid = cid.trim().toUpperCase();
    pushMessage({ type: 'user', content: upperCaseCid });
    try {
      const [valid, prompts] = await getDesignElementsByCID(upperCaseCid);
      if (!valid) {
        pushMessage({ type: 'bot', content: 'Invalid Control ID. Please try again.' });
        return;
      }
      setControlId(upperCaseCid);
      setIdPrompts(prompts);
      pushMessage({ type: 'bot', content: 'Control ID validated. Upload evidence files.' });
    } catch {
      pushMessage({ type: 'bot', content: 'Error validating Control ID.' });
    }
  };



  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files || !controlId) return;
    const arr = Array.from(files);
    const totalBytes = arr.reduce((sum, file) => sum + file.size, 0);
    const totalMB = totalBytes / (1024 * 1024);
    if (totalMB > MAX_TOTAL_EVIDENCE_MB) {
      setEvidenceFiles([]);
      pushMessage({ type: 'bot', content: `Evidence size exceeds ${MAX_TOTAL_EVIDENCE_MB} MB limit. Please try again` });
      pushMessage({ type: 'bot', content: 'Upload evidence files again.' });
      return;
    }
    setEvidenceFiles(arr);
    pushMessage({ type: 'user', content: `Uploaded ${arr.length} file(s)` });
    pushMessage({ type: 'bot', content: `Question: ${idPrompts[0].question}` });
    pushMessage({ type: 'bot', content: 'Click "Select Design Elements" to choose.' });
  };



  // Toggle checkbox
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  };



  // Process selected prompts
  const handleProcess = async () => {
    // Clear previous
    setTableCols([]);
    setTableData([]);
    const toSubmit = selectedIds.filter(id => !submittedIds.includes(id));
    if (!toSubmit.length) return;



    // Show selected prompts
    toSubmit.forEach(id => {
      const p = idPrompts.find(el => el.id === id)?.prompt;
      if (p) pushMessage({ type: 'user', content: p });
    });



    setShowDropdown(false);
    setIsProcessing(true);
    pushMessage({ type: 'bot', content: 'Processing...' });



    try {
      const elements = idPrompts.filter(el => toSubmit.includes(el.id));
      const res = await processDesignElements(
        controlId!,
        elements.map(e => ({ id: e.id, prompt: e.prompt, question: e.question, de: e.design_element ? e.design_element : "" })),
        evidenceFiles
      );


      // change first column of each row
      const rows = res.flatMap((r, index) => {
        let txt = r.answer.trim();
        if (txt.startsWith('```')) {
          txt = txt.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        try {
          const obj = JSON.parse(txt);
          const updatedRow = Array.isArray(obj) ? obj : [obj];
          console.log("Parsed JSON: ", updatedRow);
          updatedRow.forEach(row => {
            row.Control = idPrompts[(Number(r.designElementId)) - 1]?.design_element;
          });
          console.log("Updated Row ", updatedRow);
          return updatedRow;
        } catch {
          return [
            {
              Control: idPrompts[index]?.prompt || r.question,
              ANSWER: r.answer,
              Answer_Quality: '',
              Answer_Source: '',
              Summary: '',
              Reference: ''
            }
          ];
        }
      });



      const cols = ['Control', 'Answer', 'Answer_Quality', 'Answer_Source', 'Summary', 'Reference'];
      setTableCols(cols);
      setTableData(rows);



      // Remove processing message
      setMessages(prev => prev.filter(m => m.content !== 'Processing...'));
      pushMessage({ type: 'bot', content: 'Here are the results:' });
      setSubmittedIds(prev => [...prev, ...toSubmit]);



      // Clear selections
      setSelectedIds([]);
    } catch {
      pushMessage({ type: 'bot', content: 'Error processing prompts.' });
    } finally {
      setIsProcessing(false);
    }
  };



  // Export CSV
  const exportCSV = () => {
    const csv = [tableCols.join(',')]
      .concat(tableData.map(r => tableCols.map(c => JSON.stringify(r[c] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'results.csv'; a.click();
    URL.revokeObjectURL(url);
  };


  // Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tableData, { header: tableCols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'results.xlsx');
  };



  return (
    // <Protected withRole={roles} Denied={() => <RestrictAccess />}>
      <div className={styles.container}>
        <div className={styles.chatContainer}>
          {/* Chat messages */}
          <div ref={messagesContainerRef} className={styles.messagesContainer}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.messageWrapper} ${styles[m.type]}`}>
                <div className={styles.messageContent}>{m.content}</div>
              </div>
            ))}
            {/* Table as a bot bubble */}
            {tableData.length > 0 && (
              <div className={`${styles.tableMessageWrapper} ${styles.bot}`}>
                <div className={styles.messageContent}>
                  <button onClick={exportExcel} className={styles.exportButtonTop}>
                    Export Excel
                  </button>
                  <table className={styles.resultTable}>
                    <thead>
                      <tr>
                        {tableCols.map(c => (
                          <th key={c} className={styles.tableHeader}>
                            {c.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, ri) => (
                        <tr key={ri}>
                          {tableCols.map(col => (
                            <td key={col}>
                              {col === 'Answer_Quality' ? (
                                <span
                                  className={
                                    row[col] === 'Adequate'
                                      ? styles.adequateCell
                                      : row[col] === 'Inadequate'
                                        ? styles.inadequateCell
                                        : styles.needsReviewCell
                                  }
                                >
                                  {row[col]}
                                </span>
                              ) : (
                                row[col]
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>



          {/* Input area */}
          <div className={styles.inputContainer}>
            {!controlId ? (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleControlIdSubmit(inputRef.current?.value || '');
                }}
                className={styles.inputForm}
              >
                <input ref={inputRef} className={styles.input} placeholder="Control ID..." />
                <button type="submit" className={styles.sendButton}>→</button>
              </form>
            ) : evidenceFiles.length === 0 ? (
              <div className={styles.uploadSection}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  multiple
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <button className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
                  Upload Files
                </button>
              </div>
            ) : !showDropdown ? (
              <button
                className={styles.sendButton}
                onClick={() => { setShowDropdown(true); setSelectedIds([]); }}
                disabled={isProcessing}
              >
                Select Design Elements
              </button>
            ) : (
              <div className={styles.dropdownSection}>
                <button
                  className={styles.submitButton}
                  onClick={handleSelectAll}
                  disabled={isProcessing}
                >
                  {selectedIds.length === idPrompts.length ? 'Deselect All' : 'Select All'}


                </button>
                <div className={styles.checkboxList}>
                  {idPrompts.map((el, i) => (
                    <label key={el.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(el.id)}
                        disabled={submittedIds.includes(el.id) || isProcessing}
                        onChange={e => toggleSelect(el.id, e.target.checked)}
                      />
                      <span>
                        &nbsp;{el.design_element ?? el.prompt}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  className={styles.submitButton}
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
          {tableData.length > 0 && (
            <div className={styles.startOverContainer}>
              <button className={styles.startOverButton} onClick={handleStartOver}>
                Start Over
              </button>
            </div>
          )}
        </div>
      </div>
    // </Protected>
  );
}



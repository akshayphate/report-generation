import { useState, useRef, useEffect } from 'react';
import styles from '../styles/Chat.module.css';

interface Message {
  type: 'user' | 'bot';
  content: string;
  files?: File[];
}

interface ChatState {
  controlId: string | null;
  evidenceFiles: File[];
  messages: Message[];
  isUploading: boolean;
  isProcessing: boolean;
}

export default function Chat() {
  const [state, setState] = useState<ChatState>({
    controlId: null,
    evidenceFiles: [],
    messages: [
      {
        type: 'bot',
        content: 'Welcome to the Vendor Assessment Chat. Please enter the Control or Domain ID to begin.'
      }
    ],
    isUploading: false,
    isProcessing: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleControlIdSubmit = async (controlId: string) => {
    if (!controlId.trim()) {
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          { type: 'bot', content: 'Please enter a valid Control or Domain ID.' }
        ]
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      controlId,
      messages: [
        ...prev.messages,
        { type: 'user', content: controlId },
        { type: 'bot', content: 'Please upload one or more evidence files to proceed with the assessment.' }
      ]
    }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setState(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...fileArray],
      messages: [
        ...prev.messages,
        { type: 'user', content: `Uploaded ${fileArray.length} file(s)`, files: fileArray }
      ],
      isUploading: true,
      isProcessing: true
    }));

    // Here you would call your service to process the files
    // For now, we'll simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        { type: 'bot', content: 'I\'ve reviewed your evidence files. What would you like to know about the vendor?' }
      ],
      isUploading: false,
      isProcessing: false
    }));
  };

  const handleMessageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    if (!state.controlId) {
      await handleControlIdSubmit(message);
    }

    input.value = '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatContainer}>
        <div className={styles.messagesContainer}>
          {state.messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.messageWrapper} ${styles[message.type]}`}
            >
              <div className={styles.messageContent}>
                {message.content}
                {message.files && (
                  <div className={styles.fileList}>
                    {message.files.map((file, fileIndex) => (
                      <div key={fileIndex} className={styles.fileItem}>
                        <span className={styles.fileIcon}>📎</span>
                        <span className={styles.fileName}>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {state.isProcessing && (
            <div className={`${styles.messageWrapper} ${styles.bot}`}>
              <div className={styles.messageContent}>
                <div className={styles.processingMessage}>
                  <span className={styles.loadingIcon}>⟳</span>
                  <span>Processing your files...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          {!state.controlId ? (
            <form onSubmit={handleMessageSubmit} className={styles.inputForm}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter Control or Domain ID..."
                className={styles.input}
              />
              <button type="submit" className={styles.sendButton}>
                <span className={styles.sendIcon}>→</span>
              </button>
            </form>
          ) : (
            <div className={styles.uploadSection}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadButton}
                disabled={state.isUploading}
              >
                {state.isUploading ? (
                  <span className={styles.loadingIcon}>⟳</span>
                ) : (
                  <span className={styles.uploadIcon}>📁</span>
                )}
                <span>{state.isUploading ? 'Uploading...' : 'Upload Evidence Files'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
# Third Party Risk Evaluation Service

A Next.js application for processing questionnaires and evidence files to generate risk evaluation reports.

## Features

- Upload questionnaire files (supports PDF, Word, Excel, and CSV formats)
- Upload evidence files
- Process questionnaires to extract questions
- Generate analytical reports using an AI-powered LLM component
- Display results in a clean, professional interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload a questionnaire file (PDF, Word, Excel, or CSV format)
2. Upload an evidence file
3. Click "Generate Report"
4. View the generated report with question-answer pairs and quality assessments

## API Documentation

### `/api/process-questionnaire`

Processes questionnaire files and extracts questions.

**Method:** POST  
**Input:** FormData with a 'questionnaire' file  
**Output:** JSON array of questions with id, question, and prompt fields

### `/api/generate-report`

Generates a report based on the questions and evidence.

**Method:** POST  
**Input:** FormData with 'questions' JSON string and 'evidence' file  
**Output:** JSON array of report items with id, question, answer, and answerQuality fields

## Implementation Details

The application uses:
- Next.js for frontend and API routes
- FormData for file uploads
- XLSX library for Excel file processing
- Custom styling with CSS Modules
- Responsive design for all device sizes

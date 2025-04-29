# Document Summarization App

A Next.js application for uploading and processing documents to generate summarized reports.

## Features

- Upload questionnaire documents
- Upload multiple evidence documents
- Generate summarized reports in Q&A format
- Clean and responsive user interface
- Error handling and loading states

## Tech Stack

- Next.js
- TypeScript
- CSS Modules
- React Hooks

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/<your-username>/<repository-name>.git
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
my-next-app/
├── pages/
│   ├── index.tsx (Homepage)
│   └── summarize.tsx (Main page)
├── styles/
│   ├── Home.module.css
│   └── Summarize.module.css
├── services/
│   └── reportService.ts
└── types/
    └── report.ts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

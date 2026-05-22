# Hoppy

Hoppy is a small full-stack workspace for roadmap-style daily practice planning, PDF music note uploads, and browser-based sound recording.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Shared dev workflow: npm workspaces

## Features

- Create roadmap sections and manage their completion progress
- Add, edit, complete, and remove tasks with deadlines
- Upload music notes as PDF files
- Record audio in the browser and save the recording to the backend
- Preview uploaded notes and recordings through the API

## Development

Install dependencies from the repository root, then run both apps together:

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Scripts

- `npm run dev` - run frontend and backend together
- `npm run build` - build both apps
- `npm run lint` - lint both apps

## Notes

The backend stores roadmap sections, practice tasks, and uploaded PDF/audio blobs in a SQLite database at `apps/api/data/hoppy.db`. The database file is created automatically at runtime.

# East Coast Railway I-Card Management System

## Overview
A full-stack application to manage Railway employee ID-card applications and generation. Static frontend is under `public/`, backend is an Express server with MongoDB.

## Features
- Employee application forms
  - Gazetted and Non‑Gazetted application flows
  - Client-side validations and file uploads
- Admin panel
  - Review applications and update statuses
  - Generate QR codes and ID card PDFs
- Status tracking
  - Public status lookup by application/reference
- ID Card generation (PDF)
  - Two-page layout with profile, QR, and metadata
  - Uses `pdfkit` and `qrcode`
- Security & hardening
  - CORS, Helmet, HPP, Rate limiting, XSS/mongo sanitization
- Robust server startup
  - Auto retry DB connection, incremental port fallback, error handling

## Prerequisites
- Node.js 18+
- MongoDB running locally or a connection string in `.env`

## Setup
1. Create a `.env` file (optional):
```
MONGO_URI=mongodb://localhost:27017/icard_db
CORS_ORIGIN=*
PORT=3000
```
2. Install dependencies:
```
npm install
```

## Run
- Development (auto-restart):
```
npm run dev
```
- Production:
```
npm start
```
App serves frontend at `http://localhost:3000` (or next free port if 3000 is in use).

## Project structure
- `server.js`: Express server and routes
- `controllers/`: API route handlers
- `models/`: Mongoose schemas
- `public/`: Static frontend files
- `utils/`: Helper utilities

## API Endpoints (partial)
- `POST /api/generate-idcard` → returns generated PDF
- `GET /api/status/*`, `POST /api/forms/*`, `GET/POST /api/admin/*`, `GET/POST /api/user/*`

## GitHub and Hosting
### 1) Source control
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Sekhar03/railway-icard-system.git
git push -u origin main
```

### 2) Host the static frontend on GitHub Pages
We publish the `public/` folder to `docs/` so GitHub Pages can serve it.

- Already prepared: a `docs/` folder mirrors `public/`.
- Enable Pages in GitHub repo Settings → Pages → Build and deployment:
  - Source: `Deploy from a branch`
  - Branch: `main` and folder `docs/`
- Your site will be available at:
  - `https://sekhar03.github.io/railway-icard-system/`

Notes:
- GitHub Pages hosts only static files. Pages cannot run the Node.js backend.
- Frontend requests to API endpoints will fail on Pages unless you deploy the backend separately and point the frontend to that URL.

### 3) Host the backend (choose one)
- Railway/Render/Fly.io/Heroku (example)
  - Set `MONGO_URI` and other env vars
  - Start command: `node server.js`
- Self-host/VPS
  - Reverse proxy with Nginx, run with PM2

After backend is live, update frontend AJAX/API base URLs to the deployed API domain.

### 4) Deploy on Vercel (server + static)
- Import GitHub repo: `Sekhar03/railway-icard-system`
- Framework Preset: Express
- Root Directory: `./`
- Build Command: None
- Output Directory: N/A
- Install Command: auto (`npm install`/`yarn install`/`pnpm install`)
- Environment Variables:
  - `EXAMPLE_NAME=I9JU23NF394R6HH`
  - `MONGO_URI=<your Mongo connection string>`
  - `CORS_ORIGIN=*` (optional)

Notes for Vercel:
- `vercel.json` routes `/api/*` to the Node server. Static assets are served from `/public`.
- The app exports the Express `app` and avoids calling `listen` on Vercel.

## Notes
- Ensure MongoDB is accessible via `MONGO_URI`.
- Uploaded images are stored under `public/uploads/` by default.
- For Pages demo, uploads and API calls won’t work without a hosted backend.

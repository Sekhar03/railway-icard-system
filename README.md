# East Coast Railway I-Card Management System

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

## Deploy to GitHub
Initialize and push:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Sekhar03/railway-icard-system.git
git push -u origin main
```

## Notes
- Ensure MongoDB is accessible via `MONGO_URI`.
- Uploaded images are stored under `public/uploads/` by default.

# Wrap AI — Deploy Guide

[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy%20with-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/new)

This guide covers deploying the backend to Render and the frontend to Vercel, plus the required environment variables.

## 1) Backend (Render)

Path: `backend/render.yaml`

Deploy steps
- Commit and push your repo to GitHub (ensure `backend/render.yaml` is present).
- Go to https://render.com → New → Blueprint → From repo.
- Select your repo and branch (defaults to `production` in `render.yaml`; change if needed).
- Render will provision a Web Service and auto-deploy on each push.

CLI quick start
```bash
# In backend folder
git add .
git commit -m "Render deploy config added"
git push
```

Required environment variables (Render → Service → Environment)
- NODE_ENV=production
- PORT=8080
- MONGODB_URI=your MongoDB Atlas URI (use Render’s dashboard, do not commit secrets)
- JWT_SECRET=your strong random secret
- CLIENT_URL=https://your-frontend.vercel.app
- CLIENT_ORIGIN=https://your-frontend.vercel.app
- AI_PROVIDER=groq
- GROQ_API_KEY=your Groq API key
- GEMINI_API_KEY= (optional)
- DEEPSEEK_API_KEY= (optional)
- OPENAI_API_KEY= (required for TTS voice notes)
- LOG_LEVEL=info (optional; can be toggled at runtime via API)
- BAILEYS_LOG_LEVEL=error (optional)

Notes
- CORS: Backend reads CLIENT_ORIGIN/CLIENT_URL and enables CORS accordingly. Set these to your Vercel domain.
- Do not hardcode secrets in files; set them in Render’s dashboard.
- The service in `render.yaml` points to `rootDir: backend` and uses `npm run start`.

## 2) Frontend (Vercel)

Path: `frontend/vercel.json`

Deploy steps
- Import the repo in Vercel and select the `frontend` folder as the project root.
- Vercel will detect a Vite app (build output `dist`).
- Set environment variables in Vercel → Project Settings → Environment Variables.
- Deploy.

CLI quick start
```bash
# In frontend folder
git add .
git commit -m "Vercel deploy config added"
git push
```

Required environment variables (Vercel)
- VITE_API_URL=https://your-backend.onrender.com

Framework config
- vercel.json is configured for Vite using `@vercel/static-build` with `vite.config.js`.

Notes
- If your Render URL changes, update VITE_API_URL and redeploy.
- SPA routing is handled by the `routes` fallback in `vercel.json`.

## FAQ → Smart AI Replies
- Upload FAQs as PDF, TXT, JSON, or CSV; the backend parses and stores them per userId.
- On inbound WhatsApp/Web messages: fuzzy-match against FAQs first; if no match, fall back to Groq (provider label: `ai (groq)`).
- UI tags responses as: `faq (auto)`, `ai (groq)`, or `user (manual)`.

## 3) Post‑deploy checklist
- Visit backend health: `GET https://your-backend.onrender.com/healthz` should return `{ ok: true }`.
- From the frontend, sign up/login and connect WhatsApp (QR flow).
- Upload FAQ file (PDF/TXT/JSON) or CSV; verify analytics and AI replies.
- Confirm CORS: requests from Vercel should succeed without 403/401 (when authenticated).
- Voice notes: ensure `OPENAI_API_KEY` is set; replies should include a PTT audio message.

## 4) Troubleshooting
- 403/401 on protected routes: verify JWT is added by the frontend and `JWT_SECRET` matches backend.
- CORS errors: ensure CLIENT_ORIGIN/CLIENT_URL exactly match your Vercel domain (including protocol).
- WhatsApp reconnect/401: backend auto-cleans sessions; re-scan QR if prompted.
- Slow analytics: they’re windowed and indexed; verify Mongo indexes exist and DB is reachable.

## 5) File references
- Backend blueprint: `backend/render.yaml`
- Frontend config: `frontend/vercel.json`
- Backend server: `backend/index.js`
- FAQ upload endpoints: `backend/controllers/faqController.js`
- Frontend upload UI: `frontend/src/components/FAQUpload.jsx`, `frontend/src/components/FAQManager.jsx`

## 6) Screenshots (optional)
Place screenshots in your repo and adjust the paths below as needed.

- WhatsApp QR Connect
  
  ![QR Connect](frontend/public/screenshots/qr-connect.png)

- FAQ Upload
  
  ![FAQ Upload](frontend/public/screenshots/faq-upload.png)

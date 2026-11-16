# SupplyChain AI
React + Vite frontend, FastAPI backend, scikit-learn demo models and optional MongoDB persistence.

## Run backend (PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Run frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. API docs: http://127.0.0.1:8000/docs.

MongoDB is optional. Set MONGODB_URI in backend/.env; otherwise prediction history is kept in backend memory until restart.

The models currently use synthetic demo data. They are not validated for food safety or operational decisions. Train and validate on documented, product-specific real observations before research claims.

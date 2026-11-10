# AxiomX Backend Service

FastAPI backend for multi-tenant customer support, Pinecone RAG knowledge ingestion, AI-assisted business operations, customer support tickets, workflow approvals, and activity execution.

## Quickstart

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
* **Alternative API Documentation (ReDoc):** `http://localhost:8000/redoc`
* **Health Endpoint:** `http://localhost:8000/health`
* **Readiness Endpoint:** `http://localhost:8000/ready`

Configure credentials in `.env` (never commit it); refer to `.env.example` for all required and optional variable names.

## Testing

```powershell
# Run the automated pytest suite (7 unit & integration tests)
python -m pytest

# Run the live cloud integration smoke test (MongoDB Atlas, Pinecone, OpenRouter, SMTP)
python scripts/axiomx_smoke_test.py
```

## Architecture Notes
* Knowledge uploads accept PDF, DOCX, and TXT files and use Pinecone Documents API integrated embeddings (`llama-text-embed-v2`, 1024 dimensions, Cosine metric) isolated by company namespaces (`company_{company_id}`).
* Public customer chat retrieves strictly `customer` partition knowledge.
* Internal business workflows and approvals are strictly isolated to authenticated company users.

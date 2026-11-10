# AxiomX Frontend Application

Modern React 18 + Vite + Tailwind CSS web interface for **AxiomX – AI Business & Customer Operations Copilot**.

## Quickstart

```powershell
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

The application runs on `http://localhost:5173`.

## Architecture & Routes
* `/` – Platform landing & overview page
* `/login` – User authentication
* `/register` – Multi-tenant company workspace registration
* `/c/:companySlug` – Public AI Customer Assistant & complaint registration (Component A)
* `/dashboard` – Operations KPIs, active tickets & approvals overview
* `/copilot` – AI Business Copilot (Component B, request understanding & workflow generation)
* `/knowledge` – Pinecone RAG document ingestion & partition manager (Customer vs. Internal)
* `/activities` – Activity assignment, department routing, and status tracking
* `/approvals` – Manager approval console with anti-self-approval enforcement
* `/tickets` – Internal support tickets triage & resolution queue

## Configuration
Configure environment settings in `.env` using `.env.example` as a template:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_TITLE=AxiomX Operations Copilot
```

import pytest
from app.main import app
from app.core.security import hash_password, verify_password, create_token, decode_token
from app.services.documents import chunks
from app.schemas.common import RegisterCompany, Login, ChatRequest, TicketCreate, CopilotInput

def test_openapi_has_core_routes():
    paths = app.openapi()['paths']
    assert '/api/v1/auth/login' in paths
    assert '/api/v1/auth/register-company' in paths
    assert '/api/v1/knowledge/documents/upload' in paths
    assert '/api/v1/public/companies/{company_slug}/chat' in paths
    assert '/api/v1/public/companies/{company_slug}/tickets' in paths
    assert '/api/v1/copilot/understand-request' in paths
    assert '/api/v1/copilot/generate-workflow' in paths
    assert '/api/v1/activities' in paths
    assert '/api/v1/approvals' in paths
    assert '/health' in paths
    assert '/ready' in paths

def test_health_route():
    route = next(x for x in app.routes if getattr(x, 'path', None) == '/health')
    assert route is not None

def test_password_hashing_and_verification():
    raw = "SecureSecretPassword123"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle():
    user = {"user_id": "usr_test123", "company_id": "cmp_test123", "role": "company_admin"}
    token = create_token(user)
    payload = decode_token(token)
    assert payload["sub"] == "usr_test123"
    assert payload["company_id"] == "cmp_test123"
    assert payload["role"] == "company_admin"
    assert payload["typ"] == "access"

def test_jwt_refresh_token():
    user = {"user_id": "usr_test123", "company_id": "cmp_test123", "role": "employee"}
    refresh_token = create_token(user, refresh=True)
    payload = decode_token(refresh_token, refresh=True)
    assert payload["sub"] == "usr_test123"
    assert payload["typ"] == "refresh"

def test_document_chunking_logic():
    sample_pages = [
        (1, "First paragraph. " * 30),
        (2, "Second page paragraph with important details. " * 20),
    ]
    extracted_chunks = chunks(sample_pages)
    assert len(extracted_chunks) >= 2
    for page_num, chunk_text in extracted_chunks:
        assert page_num in (1, 2)
        assert len(chunk_text) > 0

def test_pydantic_schema_validation():
    reg = RegisterCompany(
        company_name="Acme Industrial",
        company_slug="acme-industrial",
        admin_name="Jane Doe",
        admin_email="admin@acme.com",
        password="ValidPassword123"
    )
    assert reg.company_slug == "acme-industrial"

    chat = ChatRequest(message="What is the warranty period for Model X?")
    assert chat.message.startswith("What is the warranty")

    copilot = CopilotInput(request_text="Need urgent purchase approval for replacement hydraulic seals.")
    assert copilot.ticket_id is None


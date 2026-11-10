from functools import lru_cache
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "AxiomX"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"
    mongodb_uri: str = ""
    mongodb_database: str = "axiomx"
    pinecone_api_key: str = ""
    pinecone_index_name: str = "axiomx-knowledge"
    pinecone_index_host: str | None = None
    pinecone_embedding_field: str = "chunk_text"
    pinecone_title_field: str = "title"
    pinecone_namespace_prefix: str = "company_"
    pinecone_batch_size: int = 96
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-4o-mini"
    openrouter_timeout: int = 30
    jwt_secret_key: str = "unsafe-development-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10
    chunk_size_chars: int = 3600
    chunk_overlap_chars: int = 500
    rag_top_k: int = 5
    smtp_enabled: bool = False
    scheduler_enabled: bool = False
    scheduler_timezone: str = "UTC"
    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)
    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings: return Settings()

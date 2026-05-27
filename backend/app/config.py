import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Explicitly load .env from backend directory
_backend_dir = Path(__file__).resolve().parent.parent
_env_file = _backend_dir / ".env"
if _env_file.exists():
    load_dotenv(_env_file)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding='utf-8',
        extra='ignore'
    )

    # Database
    db_host: str = ""
    db_port: int = 3306
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""

    # Security
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # OpenAI
    openai_api_key: str = ""

    # Mock LLM (for testing without API key)
    use_mock_llm: bool = True

    # ChromaDB
    chroma_persist_dir: str = "./chroma_db"
    chroma_collection_name: str = "destinations"

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,https://travellant-front.onrender.com/"

    @property
    def database_url(self) -> str:
        password = quote_plus(self.db_password)

        return (
            f"mysql+pymysql://{self.db_user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()

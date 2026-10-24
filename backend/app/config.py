from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8", extra="ignore",
    )
    db_host: str = "localhost"
    db_port: int = Field(3306, ge=1, le=65535)
    db_name: str = "travel_app"
    db_user: str = "travel_user"
    db_password: str = ""
    db_ssl_ca: str | None = None
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = Field(30, ge=1, le=60)
    algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = "travellant-api"
    jwt_audience: str = "travellant-web"
    # Operator-controlled allowlist; never accepted from registration or JWT roles.
    admin_user_ids: str = ""
    openai_api_key: str = ""
    use_mock_llm: bool = True
    embedding_model: str = "all-MiniLM-L6-v2"
    app_env: Literal["development", "test", "production"] = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    trusted_hosts: str = "localhost,127.0.0.1,testserver"
    max_request_bytes: int = Field(65536, ge=1024, le=1048576)

    @model_validator(mode="after")
    def secure_configuration(self):
        if len(set(self.secret_key)) < 10 or any(
            word in self.secret_key.lower() for word in ("change-me", "changeme", "your_secret")
        ):
            raise ValueError("SECRET_KEY must be a randomly generated secret of at least 32 characters")
        for origin in self.cors_origins_list:
            parsed = urlsplit(origin)
            if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
                raise ValueError("CORS_ORIGINS must contain exact HTTP(S) origins")
            if self.app_env == "production" and parsed.scheme != "https":
                raise ValueError("Production CORS origins must use HTTPS")
        if not self.trusted_hosts_list or "*" in self.trusted_hosts_list:
            raise ValueError("TRUSTED_HOSTS must list explicit hostnames")
        if self.app_env == "production":
            if self.db_user.lower() == "root" or not self.db_password or not self.db_ssl_ca:
                raise ValueError("Production requires a non-root database user, password and DB_SSL_CA for verified TLS")
        self.admin_ids
        return self

    @property
    def database_url(self) -> URL:
        return URL.create("mysql+pymysql", username=self.db_user, password=self.db_password,
                          host=self.db_host, port=self.db_port, database=self.db_name)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def admin_ids(self) -> set[int]:
        return {int(value.strip()) for value in self.admin_user_ids.split(",") if value.strip()}


@lru_cache()
def get_settings() -> Settings:
    return Settings()

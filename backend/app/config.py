from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8", extra="ignore", populate_by_name=True,
    )
    db_host: str = "localhost"
    db_port: int = Field(3306, ge=1, le=65535)
    db_name: str = "travel_app"
    db_user: str = "travel_user"
    db_password: str = ""
    db_ssl_ca: str | None = None
    connection_url: SecretStr | None = Field(default=None, validation_alias="DATABASE_URL")
    db_schema: str = Field("travellant", pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$")
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = Field(30, ge=1, le=60)
    algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = "travellant-api"
    jwt_audience: str = "travellant-web"
    # Operator-controlled allowlist; never accepted from registration or JWT roles.
    admin_user_ids: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    google_api_key: str = ""
    google_model: str = "gemini-2.5-flash"
    llm_provider: Literal["google", "openai"] = "google"
    use_mock_llm: bool = False
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_revision: str = Field("1110a243fdf4706b3f48f1d95db1a4f5529b4d41", pattern=r"^[a-f0-9]{40}$")
    trusted_proxy_networks: str = "127.0.0.1/32,::1/128"
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
        url = self.database_url
        if url.get_backend_name() == "postgresql":
            sslmode = url.query.get("sslmode", "verify-full")
            local_test = self.app_env == "test" and url.host in ("localhost", "127.0.0.1", "::1")
            if sslmode != "verify-full" and not local_test:
                raise ValueError("PostgreSQL connections require sslmode=verify-full")
            if self.app_env == "production" and (
                not url.username or not url.password
                or url.username.split(".")[0].lower() in ("postgres", "root", "supabase_admin")
            ):
                raise ValueError("Production PostgreSQL requires a dedicated runtime role and password")
        elif self.app_env == "production":
            if self.db_user.lower() == "root" or not self.db_password or not self.db_ssl_ca:
                raise ValueError("Production requires a non-root database user, password and DB_SSL_CA for verified TLS")
        self.admin_ids
        return self

    @property
    def database_url(self) -> URL:
        if self.connection_url:
            try:
                url = make_url(self.connection_url.get_secret_value())
                if url.drivername not in ("postgres", "postgresql", "postgresql+psycopg"):
                    raise ValueError()
                if not url.host or not url.database:
                    raise ValueError()
                return url.set(drivername="postgresql+psycopg")
            except (ArgumentError, ValueError, TypeError):
                raise ValueError("DATABASE_URL must be a PostgreSQL connection URL") from None
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

"""All env-driven settings in one place, so nothing else reads os.environ."""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://tracker:tracker@localhost:5432/tracker"
    jwt_secret: str = "dev-only-change-me"  # overridden via env in compose/prod
    jwt_expire_minutes: int = 60 * 8  # one working day, then log in again

    @field_validator("database_url")
    @classmethod
    def use_psycopg3_driver(cls, url: str) -> str:
        # railway/heroku hand out postgres:// or postgresql://, sqlalchemy needs to be told which driver to use
        for plain in ("postgres://", "postgresql://"):
            if url.startswith(plain):
                return "postgresql+psycopg://" + url[len(plain) :]
        return url


settings = Settings()

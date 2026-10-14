"""All env-driven settings in one place, so nothing else reads os.environ."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://tracker:tracker@localhost:5432/tracker"
    jwt_secret: str = "dev-only-change-me"  # overridden via env in compose/prod
    jwt_expire_minutes: int = 60 * 8  # one working day, then log in again


settings = Settings()

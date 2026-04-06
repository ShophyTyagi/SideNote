from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    chroma_persist_dir: str = "./app/data/chroma"

    class Config:
        env_file = ".env"
        extra = "ignore"  # ignore unknown env vars

settings = Settings()
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://admin:password@localhost:5432/cartonbox"
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    class Config:
        env_file = ".env"

settings = Settings()

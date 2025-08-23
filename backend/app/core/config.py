from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # MongoDB Configuration
    mongodb_url: str = "mongodb://localhost:27017/contracts"
    
    # File Upload Configuration
    upload_dir: str = "./uploads"
    max_file_size: int = 52428800  # 50MB in bytes
    allowed_extensions: list = [".pdf"]
    
    # Application Configuration
    app_name: str = "Contract Intelligence Parser"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # API Configuration
    api_prefix: str = "/api/v1"
    
    # Processing Configuration
    max_concurrent_processes: int = 5
    processing_timeout: int = 300  # 5 minutes
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)

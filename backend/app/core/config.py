from pydantic import BaseModel
from typing import Optional
import os


class Settings(BaseModel):
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


# Initialize settings with environment variable overrides
def get_settings() -> Settings:
    return Settings(
        mongodb_url=os.getenv("MONGODB_URL", "mongodb://localhost:27017/contracts"),
        upload_dir=os.getenv("UPLOAD_DIR", "./uploads"),
        max_file_size=int(os.getenv("MAX_FILE_SIZE", "52428800")),
        allowed_extensions=[".pdf"],
        app_name=os.getenv("APP_NAME", "Contract Intelligence Parser"),
        app_version=os.getenv("APP_VERSION", "1.0.0"),
        debug=os.getenv("DEBUG", "False").lower() == "true",
        api_prefix=os.getenv("API_PREFIX", "/api/v1"),
        max_concurrent_processes=int(os.getenv("MAX_CONCURRENT_PROCESSES", "5")),
        processing_timeout=int(os.getenv("PROCESSING_TIMEOUT", "300"))
    )

settings = get_settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)

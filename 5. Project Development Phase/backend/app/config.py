import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "AI Powered Debt Relief & Financial Recovery Platform"
    
    # SQLite Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./debt_relief.db")
    
    # JWT Auth Configuration
    # In production, this must be a secret, high-entropy key
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "9a8f4c2d6e3f5b7a1c8d0e2f4a6b8c0d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours token expiration for convenience in testing

    # Google Gemini API key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))

settings = Settings()

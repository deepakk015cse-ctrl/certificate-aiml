import os
from pathlib import Path

APP_TITLE = "CertiExtract — Offline Certificate Platform Backend"
APP_VERSION = "1.0.0"

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
PREPROCESSED_DIR = PROCESSED_DIR  # Alias for backward compatibility
EXPORTS_DIR = DATA_DIR / "exports"
BACKUPS_DIR = DATA_DIR / "backups"
DB_FILE = DATA_DIR / "certiextract.db"
RECORDS_FILE = DATA_DIR / "records.json"

for d in [DATA_DIR, UPLOADS_DIR, PROCESSED_DIR, EXPORTS_DIR, BACKUPS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Strict offline configuration
OFFLINE_ENFORCED = True
TESSERACT_LANGUAGES = ["eng", "fra", "spa", "deu", "hin"]
SUPPORTED_LANGUAGES = TESSERACT_LANGUAGES
DEFAULT_LANGUAGE = "eng"
HOST = "127.0.0.1"
PORT = int(os.environ.get("BACKEND_PORT", 8001))

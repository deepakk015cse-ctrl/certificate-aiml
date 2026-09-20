import os
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from ..config import DATA_DIR

# Database file paths
DB_FILE = DATA_DIR / "certiextract.db"
BACKUPS_DIR = DATA_DIR / "backups"
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"

# Engine with WAL mode and foreign keys enforced
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce SQLite foreign key constraints and enable WAL mode for high concurrency."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    """Dependency for obtaining a database session in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Initialize SQLite database tables if they do not already exist."""
    from . import models  # Ensure all models are registered
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    print(f"[DATABASE] SQLite database initialized at: {DB_FILE}")

def create_local_backup() -> str:
    """
    Creates a local copy of certiextract.db for offline backup & recovery.
    Does not require any network access or cloud synchronization.
    """
    if not DB_FILE.exists():
        init_db()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"certiextract_backup_{timestamp}.db"
    backup_path = BACKUPS_DIR / backup_filename

    # Use SQLite's online backup API for safe snapshotting
    source_conn = sqlite3.connect(str(DB_FILE))
    dest_conn = sqlite3.connect(str(backup_path))
    try:
        source_conn.backup(dest_conn)
    finally:
        dest_conn.close()
        source_conn.close()

    print(f"[DATABASE] Local backup created: {backup_path}")
    return str(backup_path)

def list_local_backups():
    """Lists all available local database backup files."""
    if not BACKUPS_DIR.exists():
        return []
    backups = []
    for f in sorted(BACKUPS_DIR.glob("certiextract_backup_*.db"), reverse=True):
        stat = f.stat()
        backups.append({
            "filename": f.name,
            "path": str(f),
            "size_bytes": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        })
    return backups

# Offline Multilingual Certificate Platform (Stage 1)

## System Architecture & Security Specification

This platform is engineered specifically to satisfy strict **100% offline, air-gapped data residency standards** for academic and governmental registrar credential verification.

### Zero-Cloud Enforcement
- **External AI APIs**: Cloud LLMs (Google Gemini, OpenAI, Anthropic), cloud vision APIs (Google Cloud Vision, AWS Rekognition), and cloud translation services are **strictly forbidden and blocked**.
- **Local Inference**: All image preprocessing and optical character recognition are executed locally using CPU-bound open-source algorithms.

---

## Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── config.py             # System paths, offline flags, language packs
│   │   ├── main.py               # FastAPI application with CORS and health routes
│   │   ├── models/
│   │   │   └── schemas.py        # Pydantic schemas (Document, Preprocess, OCR, Review)
│   │   ├── routes/
│   │   │   └── documents.py      # Upload, preprocessing, OCR, review, seed, file serving
│   │   └── services/
│   │       ├── ocr_service.py    # BaseOCREngine (Strategy Pattern) + TesseractOCREngine
│   │       ├── preprocessing_service.py # OpenCV deskew, CLAHE, bilateral filter, illumination
│   │       ├── sample_generator.py # Generates synthetic certificate test scans (ENG, FRA, Skewed)
│   │       └── storage_service.py  # Local JSON and file-based persistence
│   ├── data/
│   │   ├── records.json          # Local document audit log
│   │   ├── uploads/              # Raw ingested scans
│   │   └── preprocessed/         # Normalized high-contrast deskewed scans
│   └── run_backend.sh            # Launch script for backend daemon
├── src/                          # React + TypeScript + Tailwind UI Shell
│   ├── components/               # Sidebar, Header, StatCard, StatusBadge
│   ├── pages/                    # Dashboard, Upload, Preprocessing, OCR, Review, Records, Export, Settings
│   ├── services/api.ts           # Dual-mode API client (FastAPI + Local Edge fallback)
│   └── types/index.ts            # Shared TypeScript interfaces
├── vite.config.ts                # Vite config with reverse proxy (/api -> 127.0.0.1:8000)
└── package.json
```

---

## Modular Strategy Pattern for Swappable AI/ML

The platform uses an abstract strategy pattern for OCR (`BaseOCREngine`), meaning future AI/ML models can be swapped in with zero changes to frontend code or API contracts:

```python
class BaseOCREngine(abc.ABC):
    @abc.abstractmethod
    def extract_text(self, image_path: str, lang: str = "eng") -> Dict[str, Any]:
        pass

    @abc.abstractmethod
    def get_supported_languages(self) -> List[str]:
        pass
```

Future stages (Stage 2: Named Entity Recognition / Field Extraction; Stage 3: Offline MarianMT Translation) follow the same modular architecture.

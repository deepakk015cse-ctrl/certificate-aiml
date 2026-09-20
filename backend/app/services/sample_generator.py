import os
import uuid
import datetime
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from ..config import UPLOADS_DIR, PREPROCESSED_DIR
from .storage_service import storage_service
from .preprocessing_service import preprocessing_service
from .ocr_service import ocr_manager
from .confidence_service import confidence_scoring_engine

class SampleGenerator:
    """Generates synthetic certificate scans locally for test and demonstration purposes."""

    @staticmethod
    def _create_certificate_image(
        title: str,
        recipient: str,
        details: str,
        footer: str,
        output_path: Path,
        skew_degrees: float = 0.0,
        add_noise: bool = False,
    ):
        width, height = 1200, 850
        img = Image.new("RGB", (width, height), color=(252, 250, 242))
        draw = ImageDraw.Draw(img)

        # Draw decorative certificate border
        draw.rectangle([25, 25, width - 25, height - 25], outline=(40, 60, 90), width=4)
        draw.rectangle([35, 35, width - 35, height - 35], outline=(180, 160, 120), width=2)

        # Draw header / institution
        draw.text((width // 2 - 260, 90), title, fill=(20, 35, 65))
        draw.line([width // 2 - 200, 140, width // 2 + 200, 140], fill=(180, 160, 120), width=2)

        # Draw recipient
        draw.text((width // 2 - 180, 240), "THIS CERTIFIES THAT", fill=(100, 110, 130))
        draw.text((width // 2 - 220, 300), recipient, fill=(15, 25, 50))
        draw.line([width // 2 - 250, 360, width // 2 + 250, 360], fill=(40, 60, 90), width=1)

        # Draw body details
        lines = details.split("\n")
        y = 420
        for line in lines:
            draw.text((width // 2 - 320, y), line, fill=(45, 55, 75))
            y += 40

        # Draw seal & signatures
        draw.ellipse([120, height - 210, 240, height - 90], outline=(180, 140, 50), width=3)
        draw.text((150, height - 160), "OFFICIAL SEAL", fill=(160, 120, 40))

        draw.line([width - 340, height - 120, width - 120, height - 120], fill=(40, 40, 40), width=2)
        draw.text((width - 320, height - 105), "Authorized Registrar Signature", fill=(80, 80, 80))

        # Rotate if skewed scan requested
        if abs(skew_degrees) > 0.1:
            img = img.rotate(skew_degrees, expand=True, fillcolor=(240, 238, 230))

        # Save image
        img.save(output_path, "PNG")

    @classmethod
    def seed_samples(cls):
        """Seed 3 standardized multilingual test certificates."""
        samples = [
            {
                "id": "b8851e84",
                "filename": "sample_scanned_training_award_skewed.png",
                "title": "PROFESSIONAL CONTINUING EDUCATION BOARD",
                "recipient": "JORDAN MILLER",
                "details": "Has completed all rigorous examinations and practical lab milestones\nin Distributed Edge Machine Learning and Computer Vision Systems.\nAwarded in full standing under Board Supervision.",
                "skew": -3.0,
                "status": "UPLOADED",
                "lang": "eng",
            },
            {
                "id": "89fd4a8a",
                "filename": "sample_diplome_reussite_fr.png",
                "title": "RÉPUBLIQUE FRANÇAISE - ENSEIGNEMENT SUPÉRIEUR",
                "recipient": "MARC LAURENT",
                "details": "Vu le code de l'éducation, confère au titulaire né le 14/05/2001\nle DIPLÔME DE LICENCE EN INFORMATIQUE.\nFait à Paris, le 30 juin 2025.",
                "skew": 0.0,
                "status": "AWAITING_REVIEW",
                "lang": "fra",
            },
            {
                "id": "d6c6e170",
                "filename": "sample_bachelor_degree_en.png",
                "title": "UNIVERSITY OF TECHNOLOGY AND ADVANCED SCIENCE",
                "recipient": "ALEXANDER CHEN",
                "details": "By virtue of the authority vested in the Faculty and Academic Senate,\nhereby confers the Degree of Bachelor of Science in Computer Science\nwith all honors, rights, and privileges pertaining thereto.",
                "skew": 0.0,
                "status": "APPROVED",
                "lang": "eng",
            },
        ]

        seeded_records = []

        for s in samples:
            raw_path = UPLOADS_DIR / s["filename"]
            cls._create_certificate_image(
                title=s["title"],
                recipient=s["recipient"],
                details=s["details"],
                footer="Verified Authentic Academic Record",
                output_path=raw_path,
                skew_degrees=s["skew"],
            )

            prep_meta = None
            ocr_meta = None

            # For the approved and awaiting review sample, run CV & OCR
            if s["status"] in ["AWAITING_REVIEW", "APPROVED"]:
                proc_path = PREPROCESSED_DIR / f"proc_{s['filename']}"
                try:
                    prep_meta = preprocessing_service.process(str(raw_path), str(proc_path))
                    prep_meta["processed_url"] = f"/api/files/preprocessed/proc_{s['filename']}"
                except Exception as e:
                    print(f"[PREP SEED ERROR] {e}")

                try:
                    target_for_ocr = str(proc_path) if proc_path.exists() else str(raw_path)
                    ocr_meta = ocr_manager.extract(target_for_ocr, lang=s["lang"])
                except Exception as e:
                    print(f"[OCR SEED ERROR] {e}")

            extracted_fields = None
            if ocr_meta:
                extracted_fields = confidence_scoring_engine.extract_structured_fields(
                    raw_text=ocr_meta["text"],
                    filename=s["filename"],
                    language=s["lang"],
                    avg_ocr_conf=ocr_meta.get("average_confidence", 85.0),
                    quality_score=prep_meta.get("quality_score", 0.90) if prep_meta else 0.88,
                    skew_angle=prep_meta.get("skew_angle", 0.0) if prep_meta else s["skew"],
                )

            # For skewed sample, if any field is LOW, status is LOW_CONFIDENCE
            final_status = s["status"]
            if extracted_fields and any(f["level"] == "LOW" for f in extracted_fields) and final_status not in ["APPROVED", "REJECTED"]:
                final_status = "LOW_CONFIDENCE"

            audit_trail = []
            if s["status"] == "APPROVED":
                audit_trail.append({
                    "field": "ALL_CREDENTIAL_FIELDS",
                    "original_value": "Automated OCR Stream",
                    "reviewer_edited_value": "Registrar verified and certified",
                    "confidence": 0.94,
                    "confidence_level": "HIGH",
                    "review_status": "APPROVED",
                    "review_timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "reviewer": "Registrar Officer (Station 01)",
                    "notes": "Verified against university registrar ledger. Seal and signatures authentic.",
                })

            record = {
                "id": s["id"],
                "filename": s["filename"],
                "original_filename": s["filename"],
                "file_type": "image/png",
                "file_size": raw_path.stat().st_size if raw_path.exists() else 95000,
                "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": final_status,
                "original_url": f"/api/files/uploads/{s['filename']}",
                "preprocessed": prep_meta,
                "ocr": ocr_meta,
                "extracted_fields": extracted_fields,
                "approval_notes": "Verified against university registrar ledger. Seal and signatures authentic." if s["status"] == "APPROVED" else None,
                "rejection_reason": None,
                "reviewer": "Registrar Officer (Station 01)" if s["status"] == "APPROVED" else None,
                "reviewed_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") if s["status"] == "APPROVED" else None,
                "audit_trail": audit_trail,
            }
            seeded_records.append(record)

        storage_service.reset_with_samples(seeded_records)
        return seeded_records


def generate_sample_certificates():
    return SampleGenerator.seed_samples()

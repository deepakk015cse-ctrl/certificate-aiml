import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.database.connection import SessionLocal, init_db, create_local_backup, DB_FILE
from backend.app.database.models import DocumentModel, ExtractedFieldModel, ReviewModel, ProcessingLogModel
from backend.app.database.repository import DocumentRepository

class TestCertiExtractSQLite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.db = SessionLocal()
        self.repo = DocumentRepository(self.db)
        self.test_doc_id = "test_doc_sqlite_001"
        # Clean up any leftover test data
        self.repo.delete(self.test_doc_id)

    def tearDown(self):
        self.repo.delete(self.test_doc_id)
        self.db.close()

    def test_1_database_initialization(self):
        """1. Verify SQLite database file exists and tables are created."""
        self.assertTrue(DB_FILE.exists(), "SQLite database file should exist")
        # Query each table to ensure tables exist
        self.assertIsNotNone(self.db.query(DocumentModel).count())
        self.assertIsNotNone(self.db.query(ExtractedFieldModel).count())
        self.assertIsNotNone(self.db.query(ReviewModel).count())
        self.assertIsNotNone(self.db.query(ProcessingLogModel).count())
        print("[TEST 1 PASSED] SQLite tables verified and accessible.")

    def test_2_document_insertion(self):
        """2. Verify document insertion and UPLOAD stage logging."""
        doc = self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="birth_cert_sample.png",
            file_path="/app/applet/backend/data/uploads/birth_cert_sample.png",
            certificate_type="Birth Certificate",
            source_language="eng",
            processing_status="UPLOADED",
            image_quality_score=0.92,
            original_filename="original_birth_certificate.png",
        )
        self.assertEqual(doc.id, self.test_doc_id)
        self.assertEqual(doc.processing_status, "UPLOADED")
        
        # Verify log entry
        logs = self.repo.get_logs_for_document(self.test_doc_id)
        self.assertTrue(any(l.processing_stage == "UPLOAD" and l.status == "SUCCESS" for l in logs))
        print("[TEST 2 PASSED] Document insertion and UPLOAD logging verified.")

    def test_3_field_insertion_and_extraction(self):
        """3. Verify structured field insertion and cascade relationship."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="birth_cert_sample.png",
            file_path="/app/applet/backend/data/uploads/birth_cert_sample.png",
        )
        fields = [
            {
                "field": "Full Name",
                "original_value": "Rohan Deshmukh",
                "translated_value": "Rohan Deshmukh",
                "score": 94.5,
                "level": "HIGH",
                "reason": "Clear high-contrast text line detected",
            },
            {
                "field": "Registration Number",
                "original_value": "B-2023-99812",
                "translated_value": "B-2023-99812",
                "score": 88.0,
                "level": "HIGH",
                "reason": "Pattern matched valid certificate registration",
            },
            {
                "field": "Date of Birth",
                "original_value": "14/08/2001",
                "translated_value": "14/08/2001",
                "score": 58.0,
                "level": "LOW",
                "reason": "Ink smudge over slash character",
            },
        ]
        doc = self.repo.save_ocr_and_extracted_fields(
            doc_id=self.test_doc_id,
            raw_text="Birth Certificate Name: Rohan Deshmukh DOB: 14/08/2001 Reg: B-2023-99812",
            average_confidence=80.2,
            language="eng",
            certificate_type="Birth Certificate",
            fields=fields,
        )
        self.assertEqual(len(doc.extracted_fields), 3)
        # Because one field has LOW confidence (<65%), status must require review
        self.assertEqual(doc.processing_status, "REVIEW_REQUIRED")
        print("[TEST 3 PASSED] Structured field insertion and status logic verified.")

    def test_4_field_preservation_on_human_edit(self):
        """4. Verify that editing a field preserves original_value for auditability."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="birth_cert_sample.png",
            file_path="/app/applet/backend/data/uploads/birth_cert_sample.png",
        )
        fields = [
            {
                "field": "Date of Birth",
                "original_value": "14/08/2001",
                "translated_value": "14/08/2001",
                "score": 58.0,
                "level": "LOW",
            }
        ]
        self.repo.save_ocr_and_extracted_fields(
            doc_id=self.test_doc_id,
            raw_text="DOB: 14/08/2001",
            average_confidence=58.0,
            language="eng",
            certificate_type="Birth Certificate",
            fields=fields,
        )

        # Reviewer corrects DOB from 14/08/2001 to 14/08/2000
        field = self.repo.update_field_value(
            document_id=self.test_doc_id,
            field_name="Date of Birth",
            new_value="14/08/2000",
            reviewer_name="Dr. Registrar",
        )
        self.assertIsNotNone(field)
        # Original value must remain UNCHANGED
        self.assertEqual(field.original_value, "14/08/2001", "Original value must NOT be overwritten!")
        # Corrected value stored in translated_value
        self.assertEqual(field.translated_value, "14/08/2000")
        print("[TEST 4 PASSED] Original value preservation on reviewer edit verified.")

    def test_5_review_approval(self):
        """5. Verify human review approval, reviews table entry, and log stage."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="birth_cert_sample.png",
            file_path="/app/applet/backend/data/uploads/birth_cert_sample.png",
        )
        doc = self.repo.approve_document(
            doc_id=self.test_doc_id,
            reviewer="Chief Verification Officer",
            notes="Seal and watermarks verified offline.",
        )
        self.assertEqual(doc.processing_status, "APPROVED")
        self.assertEqual(doc.reviewer, "Chief Verification Officer")

        # Check reviews record
        reviews = self.db.query(ReviewModel).filter(ReviewModel.document_id == self.test_doc_id).all()
        self.assertTrue(any(r.review_status == "APPROVED" for r in reviews))
        print("[TEST 5 PASSED] Document approval workflow verified.")

    def test_6_review_rejection(self):
        """6. Verify review rejection with explicit rejection reason."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="birth_cert_sample.png",
            file_path="/app/applet/backend/data/uploads/birth_cert_sample.png",
        )
        doc = self.repo.reject_document(
            doc_id=self.test_doc_id,
            reason="Blurry issuer stamp; unreadable signature",
            reviewer="Auditor Jones",
        )
        self.assertEqual(doc.processing_status, "REJECTED")
        self.assertEqual(doc.rejection_reason, "Blurry issuer stamp; unreadable signature")

        # Check reviews record
        reviews = self.db.query(ReviewModel).filter(ReviewModel.document_id == self.test_doc_id).all()
        self.assertTrue(any(r.review_status == "REJECTED" and "stamp" in r.rejection_reason for r in reviews))
        print("[TEST 6 PASSED] Document rejection workflow verified.")

    def test_7_retrieving_records_and_stats(self):
        """7. Verify querying documents, relations, and aggregated dashboard statistics."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="stats_test.png",
            file_path="/app/applet/backend/data/uploads/stats_test.png",
            processing_status="APPROVED",
        )
        stats = self.repo.get_dashboard_stats()
        self.assertGreaterEqual(stats["total_documents"], 1)
        self.assertGreaterEqual(stats["approved"], 1)
        print(f"[TEST 7 PASSED] Aggregated SQLite stats verified: {stats}")

    def test_8_persistence_across_session_restart(self):
        """8. Verify data persists on disk after closing database session and reopening."""
        self.repo.create_document(
            doc_id=self.test_doc_id,
            filename="persistence_test.png",
            file_path="/app/applet/backend/data/uploads/persistence_test.png",
            certificate_type="Academic Transcript",
            processing_status="APPROVED",
        )
        # Close current session
        self.db.close()

        # Open a brand-new independent session
        new_db = SessionLocal()
        new_repo = DocumentRepository(new_db)
        try:
            retrieved = new_repo.get_by_id(self.test_doc_id)
            self.assertIsNotNone(retrieved, "Document must persist across new database session")
            self.assertEqual(retrieved.certificate_type, "Academic Transcript")
            self.assertEqual(retrieved.processing_status, "APPROVED")
            print("[TEST 8 PASSED] SQLite on-disk persistence verified across session reboot.")
        finally:
            new_repo.delete(self.test_doc_id)
            new_db.close()

    def test_9_local_backup_creation(self):
        """9. Verify offline local database backup generation."""
        backup_path = create_local_backup()
        self.assertTrue(Path(backup_path).exists(), "Backup SQLite file should exist on disk")
        print(f"[TEST 9 PASSED] Local database backup generated at: {backup_path}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

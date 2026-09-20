import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import FileResponse, Response

from ..services.storage_service import storage_service
from ..services.export_service import export_service
from ..services.sample_generator import generate_sample_certificates

router = APIRouter()

def _get_or_seed_documents(provided_docs: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    if provided_docs and len(provided_docs) > 0:
        return provided_docs
    docs = storage_service.get_all()
    if not docs:
        docs = generate_sample_certificates()
    return docs

@router.get("/export/counts")
def get_export_metrics():
    """Returns real-time counts for Birth, Death, Marriage, Rejected, and Approved records."""
    documents = _get_or_seed_documents()
    return export_service.get_export_counts(documents)

@router.post("/export/counts")
def post_export_metrics(docs: Optional[List[Dict[str, Any]]] = Body(default=None)):
    """Returns real-time counts for documents passed from active frontend state."""
    documents = _get_or_seed_documents(docs)
    return export_service.get_export_counts(documents)

@router.get("/export/excel")
def download_excel_export():
    """
    Generates and downloads the official multi-sheet Excel file (.xlsx) containing:
      1. Birth Records (Only APPROVED)
      2. Death Records (Only APPROVED)
      3. Marriage Records (Only APPROVED)
      4. Rejected Records
      5. Processing Summary
    """
    documents = _get_or_seed_documents()
    excel_path = export_service.generate_excel(documents)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"Certificate_Ledger_Export_{timestamp}.xlsx"

    return FileResponse(
        path=excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=download_filename,
        headers={"Access-Control-Expose-Headers": "Content-Disposition"}
    )

@router.post("/export/excel")
def post_download_excel_export(docs: Optional[List[Dict[str, Any]]] = Body(default=None)):
    """
    Generates and downloads multi-sheet Excel file (.xlsx) using passed client state.
    """
    documents = _get_or_seed_documents(docs)
    excel_path = export_service.generate_excel(documents)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"Certificate_Ledger_Export_{timestamp}.xlsx"

    return FileResponse(
        path=excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=download_filename,
        headers={"Access-Control-Expose-Headers": "Content-Disposition"}
    )

@router.get("/export/csv")
def download_csv_export(sheet: str = Query("birth", pattern="^(birth|death|marriage|rejected|summary)$")):
    """
    Downloads RFC 4180 compliant CSV export for a specific record category.
    Zero cloud dependencies, generated natively via Python Pandas.
    """
    documents = _get_or_seed_documents()
    csv_content = export_service.generate_csv(documents, sheet_type=sheet)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"Certificate_{sheet.capitalize()}_Records_{timestamp}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.post("/export/csv")
def post_download_csv_export(
    sheet: str = Query("birth", pattern="^(birth|death|marriage|rejected|summary)$"),
    docs: Optional[List[Dict[str, Any]]] = Body(default=None)
):
    """
    Downloads RFC 4180 compliant CSV export for a specific record category from client documents.
    """
    documents = _get_or_seed_documents(docs)
    csv_content = export_service.generate_csv(documents, sheet_type=sheet)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    download_filename = f"Certificate_{sheet.capitalize()}_Records_{timestamp}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

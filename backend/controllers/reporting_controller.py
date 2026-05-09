"""Reporting API endpoints.

Validates: Requirements 10.1, 11.1, 14.1
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import uuid

from database import get_db
from auth.dependencies import require_roles
from models.user import User
from services.reporting_service import ReportingService


router = APIRouter(prefix="/api/reports", tags=["Reports"])

REPORT_ROLES = ["ADMIN", "PRODUCTION_MANAGER", "STORE_MANAGER", "AUDITOR"]


def _parse_uuid(value: Optional[str], label: str) -> Optional[uuid.UUID]:
    if value is None:
        return None
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


@router.get("/raw-material-stock")
def raw_material_stock_report(
    paper_type: Optional[str] = Query(None),
    gsm: Optional[int] = Query(None),
    supplier: Optional[str] = Query(None),
    low_stock_threshold: Optional[float] = Query(None, ge=0),
    include_history: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(REPORT_ROLES)),
):
    service = ReportingService(db)
    return service.raw_material_stock_report(
        paper_type=paper_type,
        gsm=gsm,
        supplier=supplier,
        low_stock_threshold=low_stock_threshold,
        include_history=include_history,
    )


@router.get("/low-stock-alerts")
def low_stock_alerts(
    threshold: float = Query(..., ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(REPORT_ROLES)),
):
    service = ReportingService(db)
    return service.low_stock_alerts(threshold=threshold)


@router.get("/material-consumption")
def material_consumption_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    job_card_id: Optional[str] = Query(None),
    box_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(REPORT_ROLES)),
):
    service = ReportingService(db)
    return service.material_consumption_report(
        date_from=date_from,
        date_to=date_to,
        job_card_id=_parse_uuid(job_card_id, "job_card_id"),
        box_type=box_type,
    )


@router.get("/wastage-analysis")
def wastage_analysis(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    box_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(REPORT_ROLES)),
):
    """Wastage trends - same data as material-consumption, focused on wastage.

    Validates: Requirement 11.1
    """
    service = ReportingService(db)
    report = service.material_consumption_report(
        date_from=date_from,
        date_to=date_to,
        box_type=box_type,
    )
    return {
        "totals": report["totals"],
        "trends": [
            {
                "job_card_id": row["job_card_id"],
                "job_card_number": row["job_card_number"],
                "box_type": row["box_type"],
                "wastage_quantity": row["wastage_quantity"],
                "wastage_percentage": row["wastage_percentage"],
            }
            for row in report["per_job_card"]
        ],
    }


@router.get("/finished-goods-stock")
def finished_goods_stock_report(
    box_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(REPORT_ROLES + ["DISPATCH_MANAGER"])
    ),
):
    service = ReportingService(db)
    return service.finished_goods_stock_report(
        box_type=box_type,
        date_from=date_from,
        date_to=date_to,
    )

"""Reporting service.

Implements raw material stock, finished goods stock, material consumption,
wastage, and low-stock reports.

Validates: Requirements 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4,
14.1, 14.2, 14.3, 14.4
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from datetime import date
import uuid

from models.paper_roll import PaperRoll
from models.raw_material_inventory import RawMaterialInventory
from models.inventory_inward import InventoryInward
from models.material_issue import MaterialIssue
from models.job_card import JobCard
from models.finished_goods import FinishedGoods
from models.finished_goods_inventory import FinishedGoodsInventory
from models.finished_goods_inward import FinishedGoodsInward
from models.finished_goods_outward import FinishedGoodsOutward


class ReportingService:
    """Aggregate reporting queries."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # 14.1 Raw material stock report (Req 10.1, 10.2, 10.3, 10.4)
    # ------------------------------------------------------------------
    def raw_material_stock_report(
        self,
        paper_type: Optional[str] = None,
        gsm: Optional[int] = None,
        supplier: Optional[str] = None,
        low_stock_threshold: Optional[float] = None,
        include_history: bool = False,
    ) -> List[Dict[str, Any]]:
        """Return raw material stock with optional filters and history.

        Each row includes paper roll metadata, current stock, opening stock,
        a low-stock flag, and (optionally) inward/issue history.
        """
        query = (
            self.db.query(PaperRoll, RawMaterialInventory)
            .outerjoin(
                RawMaterialInventory,
                RawMaterialInventory.paper_roll_id == PaperRoll.id,
            )
        )
        if paper_type is not None:
            query = query.filter(PaperRoll.paper_type == paper_type)
        if gsm is not None:
            query = query.filter(PaperRoll.gsm == gsm)
        if supplier is not None:
            query = query.filter(PaperRoll.supplier == supplier)

        rows: List[Dict[str, Any]] = []
        for paper_roll, inventory in query.all():
            current_stock = (
                float(inventory.current_stock) if inventory is not None else 0.0
            )
            opening_stock = (
                float(inventory.opening_stock) if inventory is not None else 0.0
            )
            unit = inventory.unit if inventory is not None else None
            is_low_stock = (
                low_stock_threshold is not None
                and current_stock < float(low_stock_threshold)
            )
            row: Dict[str, Any] = {
                "paper_roll_id": paper_roll.id,
                "material_code": paper_roll.material_code,
                "paper_type": paper_roll.paper_type,
                "gsm": paper_roll.gsm,
                "roll_width": float(paper_roll.roll_width),
                "supplier": paper_roll.supplier,
                "current_stock": current_stock,
                "opening_stock": opening_stock,
                "unit": unit,
                "is_low_stock": is_low_stock,
            }
            if include_history:
                row["inward_history"] = self._inward_history(paper_roll.id)
                row["issue_history"] = self._issue_history(paper_roll.id)
            rows.append(row)
        return rows

    def _inward_history(self, paper_roll_id: uuid.UUID) -> List[Dict[str, Any]]:
        records = (
            self.db.query(InventoryInward)
            .filter(InventoryInward.paper_roll_id == paper_roll_id)
            .order_by(InventoryInward.receipt_date.asc())
            .all()
        )
        return [
            {
                "id": r.id,
                "quantity_received": float(r.quantity_received),
                "receipt_date": r.receipt_date,
                "status": r.status,
                "supplier": r.supplier,
                "purchase_reference": r.purchase_reference,
            }
            for r in records
        ]

    def _issue_history(self, paper_roll_id: uuid.UUID) -> List[Dict[str, Any]]:
        records = (
            self.db.query(MaterialIssue)
            .filter(MaterialIssue.paper_roll_id == paper_roll_id)
            .order_by(MaterialIssue.issue_date.asc())
            .all()
        )
        return [
            {
                "id": r.id,
                "job_card_id": r.job_card_id,
                "issued_quantity": float(r.issued_quantity),
                "issue_date": r.issue_date,
                "status": r.status,
            }
            for r in records
        ]

    # ------------------------------------------------------------------
    # Low-stock alerts (Req 10.2)
    # ------------------------------------------------------------------
    def low_stock_alerts(self, threshold: float) -> List[Dict[str, Any]]:
        """Return raw materials whose current stock is strictly below threshold."""
        if threshold < 0:
            raise ValueError("threshold must be non-negative")
        rows = (
            self.db.query(PaperRoll, RawMaterialInventory)
            .join(
                RawMaterialInventory,
                RawMaterialInventory.paper_roll_id == PaperRoll.id,
            )
            .filter(RawMaterialInventory.current_stock < threshold)
            .all()
        )
        return [
            {
                "paper_roll_id": pr.id,
                "material_code": pr.material_code,
                "paper_type": pr.paper_type,
                "gsm": pr.gsm,
                "supplier": pr.supplier,
                "current_stock": float(inv.current_stock),
                "unit": inv.unit,
                "threshold": float(threshold),
                "shortfall": float(threshold) - float(inv.current_stock),
            }
            for pr, inv in rows
        ]

    # ------------------------------------------------------------------
    # 14.3 Material consumption report (Req 11.1, 11.2, 11.3, 11.4)
    # ------------------------------------------------------------------
    def material_consumption_report(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        job_card_id: Optional[uuid.UUID] = None,
        box_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compare planned vs actual material consumption per job card.

        wastage = actual_issued - planned_required
        wastage_pct = wastage / planned * 100  (0 if planned == 0)
        """
        query = self.db.query(JobCard)
        if job_card_id is not None:
            query = query.filter(JobCard.id == job_card_id)
        if box_type is not None:
            query = query.filter(JobCard.box_type == box_type)
        if date_from is not None:
            query = query.filter(JobCard.planned_start_date >= date_from)
        if date_to is not None:
            query = query.filter(JobCard.planned_end_date <= date_to)

        per_job: List[Dict[str, Any]] = []
        total_planned = 0.0
        total_actual = 0.0
        for job in query.all():
            planned = (
                float(job.required_paper_quantity)
                if job.required_paper_quantity is not None
                else 0.0
            )
            actual_total = (
                self.db.query(func.coalesce(func.sum(MaterialIssue.issued_quantity), 0))
                .filter(MaterialIssue.job_card_id == job.id)
                .scalar()
            )
            actual = float(actual_total or 0.0)
            wastage = actual - planned
            wastage_pct = self.calculate_wastage_percentage(planned, actual)
            per_job.append(
                {
                    "job_card_id": job.id,
                    "job_card_number": job.job_card_number,
                    "box_type": job.box_type,
                    "planned_quantity": planned,
                    "actual_issued": actual,
                    "wastage_quantity": wastage,
                    "wastage_percentage": wastage_pct,
                    "status": job.status,
                }
            )
            total_planned += planned
            total_actual += actual

        aggregate_pct = self.calculate_wastage_percentage(total_planned, total_actual)
        return {
            "per_job_card": per_job,
            "totals": {
                "planned_quantity": total_planned,
                "actual_issued": total_actual,
                "wastage_quantity": total_actual - total_planned,
                "wastage_percentage": aggregate_pct,
            },
        }

    @staticmethod
    def calculate_wastage_percentage(planned: float, actual: float) -> float:
        """Compute wastage percentage.

        Returns 0.0 when planned <= 0 to avoid division by zero (Req 11.2).
        """
        planned = float(planned)
        actual = float(actual)
        if planned <= 0:
            return 0.0
        return ((actual - planned) / planned) * 100.0

    # ------------------------------------------------------------------
    # 14.5 Finished goods stock report (Req 14.1, 14.2, 14.3, 14.4)
    # ------------------------------------------------------------------
    def finished_goods_stock_report(
        self,
        box_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Return FG with produced/dispatched/balance and source job cards."""
        query = self.db.query(FinishedGoods, FinishedGoodsInventory).outerjoin(
            FinishedGoodsInventory,
            FinishedGoodsInventory.finished_goods_id == FinishedGoods.id,
        )
        if box_type is not None:
            query = query.filter(FinishedGoods.box_type == box_type)

        rows: List[Dict[str, Any]] = []
        for fg, inv in query.all():
            inward_q = self.db.query(FinishedGoodsInward).filter(
                FinishedGoodsInward.finished_goods_id == fg.id
            )
            outward_q = self.db.query(FinishedGoodsOutward).filter(
                FinishedGoodsOutward.finished_goods_id == fg.id,
                FinishedGoodsOutward.status == "APPROVED",
            )
            if date_from is not None:
                inward_q = inward_q.filter(
                    FinishedGoodsInward.confirmation_date >= date_from
                )
                outward_q = outward_q.filter(
                    FinishedGoodsOutward.dispatch_date >= date_from
                )
            if date_to is not None:
                inward_q = inward_q.filter(
                    FinishedGoodsInward.confirmation_date <= date_to
                )
                outward_q = outward_q.filter(
                    FinishedGoodsOutward.dispatch_date <= date_to
                )

            inward_records = inward_q.all()
            produced = sum(int(r.net_quantity) for r in inward_records)
            dispatched = sum(int(r.quantity) for r in outward_q.all())
            balance = (
                int(inv.current_stock) if inv is not None else 0
            )
            source_job_cards = sorted(
                {str(r.job_card_id) for r in inward_records}
            )
            rows.append(
                {
                    "finished_goods_id": fg.id,
                    "box_type": fg.box_type,
                    "box_length": float(fg.box_length),
                    "box_width": float(fg.box_width),
                    "box_height": float(fg.box_height),
                    "ply_type": fg.ply_type,
                    "quantity_produced": produced,
                    "quantity_dispatched": dispatched,
                    "current_balance": balance,
                    "unit": inv.unit if inv is not None else None,
                    "source_job_cards": source_job_cards,
                }
            )
        return rows

from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional, List
import uuid

from models.finished_goods_outward import FinishedGoodsOutward


class FinishedGoodsOutwardRepository:
    """Repository for FinishedGoodsOutward dispatch transactions."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        finished_goods_id: uuid.UUID,
        quantity: int,
        destination: str,
        dispatch_date: date,
        requested_by: uuid.UUID,
    ) -> FinishedGoodsOutward:
        outward = FinishedGoodsOutward(
            finished_goods_id=finished_goods_id,
            quantity=quantity,
            destination=destination,
            dispatch_date=dispatch_date,
            requested_by=requested_by,
            status="PENDING",
        )
        self.db.add(outward)
        try:
            self.db.commit()
            self.db.refresh(outward)
            return outward
        except Exception as e:
            self.db.rollback()
            raise ValueError(f"Failed to create finished goods outward: {e}")

    def get_by_id(
        self, outward_id: uuid.UUID
    ) -> Optional[FinishedGoodsOutward]:
        return (
            self.db.query(FinishedGoodsOutward)
            .filter(FinishedGoodsOutward.id == outward_id)
            .first()
        )

    def update_status(
        self,
        outward_id: uuid.UUID,
        new_status: str,
        approved_by: uuid.UUID,
    ) -> FinishedGoodsOutward:
        outward = self.get_by_id(outward_id)
        if outward is None:
            raise ValueError(f"FinishedGoodsOutward {outward_id} not found")
        outward.status = new_status
        outward.approved_by = approved_by
        outward.approval_date = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(outward)
        return outward

    def list(
        self,
        finished_goods_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FinishedGoodsOutward]:
        q = self.db.query(FinishedGoodsOutward)
        if finished_goods_id is not None:
            q = q.filter(
                FinishedGoodsOutward.finished_goods_id == finished_goods_id
            )
        if status is not None:
            q = q.filter(FinishedGoodsOutward.status == status)
        return (
            q.order_by(FinishedGoodsOutward.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

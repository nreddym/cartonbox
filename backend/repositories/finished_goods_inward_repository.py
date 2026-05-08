from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from models.finished_goods_inward import FinishedGoodsInward


class FinishedGoodsInwardRepository:
    """Repository for FinishedGoodsInward transactions.

    Validates: Requirements 7.1, 7.4
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        finished_goods_id: uuid.UUID,
        job_card_id: uuid.UUID,
        quantity_produced: int,
        quantity_rejected: int,
        net_quantity: int,
        confirmed_by: uuid.UUID,
        confirmation_date: Optional[datetime] = None,
    ) -> FinishedGoodsInward:
        inward = FinishedGoodsInward(
            finished_goods_id=finished_goods_id,
            job_card_id=job_card_id,
            quantity_produced=quantity_produced,
            quantity_rejected=quantity_rejected,
            net_quantity=net_quantity,
            confirmed_by=confirmed_by,
            confirmation_date=confirmation_date or datetime.now(timezone.utc),
        )
        self.db.add(inward)
        self.db.commit()
        self.db.refresh(inward)
        return inward

    def get_by_id(self, inward_id: uuid.UUID) -> Optional[FinishedGoodsInward]:
        return (
            self.db.query(FinishedGoodsInward)
            .filter(FinishedGoodsInward.id == inward_id)
            .first()
        )

    def get_by_job_card_id(
        self, job_card_id: uuid.UUID
    ) -> Optional[FinishedGoodsInward]:
        return (
            self.db.query(FinishedGoodsInward)
            .filter(FinishedGoodsInward.job_card_id == job_card_id)
            .first()
        )

    def list(
        self,
        finished_goods_id: Optional[uuid.UUID] = None,
        job_card_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FinishedGoodsInward]:
        query = self.db.query(FinishedGoodsInward)
        if finished_goods_id is not None:
            query = query.filter(
                FinishedGoodsInward.finished_goods_id == finished_goods_id
            )
        if job_card_id is not None:
            query = query.filter(FinishedGoodsInward.job_card_id == job_card_id)
        return (
            query.order_by(desc(FinishedGoodsInward.confirmation_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from models.finished_goods_inventory import FinishedGoodsInventory


class FinishedGoodsInventoryRepository:
    """Repository for FinishedGoodsInventory tracking entity.

    Validates: Requirements 7.1, 7.2
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        finished_goods_id: uuid.UUID,
        current_stock: int,
        unit: str,
    ) -> FinishedGoodsInventory:
        inv = FinishedGoodsInventory(
            finished_goods_id=finished_goods_id,
            current_stock=current_stock,
            unit=unit,
        )
        self.db.add(inv)
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def get_by_finished_goods_id(
        self, finished_goods_id: uuid.UUID
    ) -> Optional[FinishedGoodsInventory]:
        return (
            self.db.query(FinishedGoodsInventory)
            .filter(FinishedGoodsInventory.finished_goods_id == finished_goods_id)
            .first()
        )

    def increment_stock(
        self,
        finished_goods_id: uuid.UUID,
        delta: int,
        unit: str = "boxes",
    ) -> FinishedGoodsInventory:
        inv = self.get_by_finished_goods_id(finished_goods_id)
        if inv is None:
            inv = self.create(
                finished_goods_id=finished_goods_id,
                current_stock=delta,
                unit=unit,
            )
            return inv
        inv.current_stock = int(inv.current_stock) + int(delta)
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def decrement_stock(
        self, finished_goods_id: uuid.UUID, delta: int
    ) -> Optional[FinishedGoodsInventory]:
        inv = self.get_by_finished_goods_id(finished_goods_id)
        if inv is None:
            return None
        if int(inv.current_stock) < int(delta):
            raise ValueError(
                f"Insufficient finished goods stock: required {delta}, "
                f"available {int(inv.current_stock)}"
            )
        inv.current_stock = int(inv.current_stock) - int(delta)
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def get_stock_level(self, finished_goods_id: uuid.UUID) -> Optional[int]:
        inv = self.get_by_finished_goods_id(finished_goods_id)
        return int(inv.current_stock) if inv else None

    def list(self, skip: int = 0, limit: int = 100) -> List[FinishedGoodsInventory]:
        return (
            self.db.query(FinishedGoodsInventory).offset(skip).limit(limit).all()
        )

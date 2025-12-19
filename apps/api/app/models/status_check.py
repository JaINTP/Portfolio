"""Status check ORM and schema models."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db import BaseModel as ORMBase


class StatusCheckRecord(ORMBase):
    """SQLAlchemy representation of a status check."""

    __tablename__ = "status_checks"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class StatusCheck(BaseModel):
    """Public representation of a stored status check."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    client_name: str
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when the status check was created.",
    )

    @classmethod
    def from_record(cls, record: StatusCheckRecord) -> "StatusCheck":
        """Convert an ORM record into a response model."""

        return cls.model_validate(record)

    def to_record(self) -> StatusCheckRecord:
        """Create ORM record from the model."""

        return StatusCheckRecord(
            id=self.id,
            client_name=self.client_name,
            timestamp=self.timestamp,
        )


class StatusCheckCreate(BaseModel):
    """Payload used when creating a status check entry."""

    client_name: str

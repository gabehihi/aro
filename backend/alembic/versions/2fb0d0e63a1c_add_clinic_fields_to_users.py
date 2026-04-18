"""add_clinic_fields_to_users

Revision ID: 2fb0d0e63a1c
Revises: dc625593ac9a
Create Date: 2026-04-17 15:40:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2fb0d0e63a1c"
down_revision: Union[str, Sequence[str], None] = "dc625593ac9a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("clinic_name", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("clinic_address", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("clinic_phone", sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("clinic_phone")
        batch_op.drop_column("clinic_address")
        batch_op.drop_column("clinic_name")

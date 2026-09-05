"""rename_email_to_nombre_usuario_in_usuarios

Revision ID: 2ce4aa08dba7
Revises: c4abe5291984
Create Date: 2026-08-28 20:04:43.597989

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ce4aa08dba7'
down_revision: Union[str, None] = 'c4abe5291984'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Renombrar columna email → nombre_usuario en la tabla usuarios
    op.alter_column('usuarios', 'email', new_column_name='nombre_usuario')


def downgrade() -> None:
    # Revertir: renombrar nombre_usuario → email
    op.alter_column('usuarios', 'nombre_usuario', new_column_name='email')

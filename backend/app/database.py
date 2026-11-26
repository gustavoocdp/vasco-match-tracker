from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Ajuste automático para PostgreSQL (Neon/Render) ou SQLite local
db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and "+psycopg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

is_sqlite = db_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {"connect_args": connect_args}

if not is_sqlite:
    # Evita erro de conexão fechada quando o Neon Serverless suspende por inatividade
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema_columns() -> None:
    """Adiciona colunas novas de forma idempotente em bancos já existentes."""
    inspector = inspect(engine)
    if "partidas" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("partidas")}
    bool_true = "1" if is_sqlite else "TRUE"

    migrations = [
        ("external_id", "ALTER TABLE partidas ADD COLUMN external_id VARCHAR(64)"),
        ("fui", f"ALTER TABLE partidas ADD COLUMN fui BOOLEAN NOT NULL DEFAULT {bool_true}"),
        ("status_jogo", "ALTER TABLE partidas ADD COLUMN status_jogo VARCHAR(20) NOT NULL DEFAULT 'finalizado'"),
        ("adversario_logo", "ALTER TABLE partidas ADD COLUMN adversario_logo VARCHAR(255)"),
        ("gols_detalhes", "ALTER TABLE partidas ADD COLUMN gols_detalhes TEXT"),
    ]

    with engine.begin() as conn:
        for col_name, ddl in migrations:
            if col_name not in existing:
                conn.execute(text(ddl))
        if "external_id" not in existing:
            conn.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_partidas_external_id ON partidas (external_id)")
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

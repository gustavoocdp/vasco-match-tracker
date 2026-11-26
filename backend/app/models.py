from sqlalchemy import Boolean, Column, Date, Float, Integer, String, Text
from app.database import Base


class Partida(Base):
    __tablename__ = "partidas"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(64), unique=True, nullable=True, index=True)
    data_jogo = Column(Date, nullable=False, index=True)
    competicao = Column(String(80), nullable=False)
    adversario = Column(String(100), nullable=False)
    adversario_logo = Column(String(255), nullable=True)
    mando = Column(String(20), nullable=False)  # Casa, Fora, Neutro
    estadio = Column(String(100), nullable=False)
    setor = Column(String(60), nullable=True)
    gols_vasco = Column(Integer, nullable=False, default=0)
    gols_adversario = Column(Integer, nullable=False, default=0)
    valor_ingresso = Column(Float, default=0.0)
    valor_extras = Column(Float, default=0.0)
    observacoes = Column(Text, nullable=True)
    fui = Column(Boolean, nullable=False, default=False)
    status_jogo = Column(String(20), nullable=False, default="finalizado")  # agendado, ao_vivo, finalizado
    gols_detalhes = Column(Text, nullable=True)  # JSON com autores e minutos dos gols

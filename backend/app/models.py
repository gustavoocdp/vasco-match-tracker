from sqlalchemy import Column, Integer, String, Date, Float, Text
from app.database import Base

class Partida(Base):
    __tablename__ = "partidas"

    id = Column(Integer, primary_key=True, index=True)
    data_jogo = Column(Date, nullable=False, index=True)
    competicao = Column(String(80), nullable=False)
    adversario = Column(String(100), nullable=False)
    mando = Column(String(20), nullable=False)  # Casa, Fora, Neutro
    estadio = Column(String(100), nullable=False)
    setor = Column(String(60), nullable=True)
    gols_vasco = Column(Integer, nullable=False)
    gols_adversario = Column(Integer, nullable=False)
    valor_ingresso = Column(Float, default=0.0)
    valor_extras = Column(Float, default=0.0)
    companhia = Column(String(100), nullable=True)
    observacoes = Column(Text, nullable=True)
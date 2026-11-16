from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

class PartidaBase(BaseModel):
    data_jogo: date
    competicao: str = Field(..., min_length=2, max_length=80)
    adversario: str = Field(..., min_length=2, max_length=100)
    mando: str = Field(..., pattern="^(Casa|Fora|Neutro)$")
    estadio: str = Field(..., min_length=2, max_length=100)
    setor: Optional[str] = Field(None, max_length=60)
    gols_vasco: int = Field(..., ge=0)
    gols_adversario: int = Field(..., ge=0)
    valor_ingresso: float = Field(default=0.0, ge=0)
    valor_extras: float = Field(default=0.0, ge=0)
    companhia: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None

class PartidaCreate(PartidaBase):
    pass

class PartidaUpdate(BaseModel):
    data_jogo: Optional[date] = None
    competicao: Optional[str] = None
    adversario: Optional[str] = None
    mando: Optional[str] = Field(None, pattern="^(Casa|Fora|Neutro)$")
    estadio: Optional[str] = None
    setor: Optional[str] = None
    gols_vasco: Optional[int] = Field(None, ge=0)
    gols_adversario: Optional[int] = Field(None, ge=0)
    valor_ingresso: Optional[float] = Field(None, ge=0)
    valor_extras: Optional[float] = Field(None, ge=0)
    companhia: Optional[str] = None
    observacoes: Optional[str] = None

class PartidaResponse(PartidaBase):
    id: int
    resultado: str  # V, E ou D calculado automaticamente
    custo_total: float

    class Config:
        from_attributes = True

class EstatisticasResponse(BaseModel):
    total_jogos: int
    vitorias: int
    empates: int
    derrotas: int
    aproveitamento_percentual: float
    gols_pro: int
    gols_contra: int
    saldo_gols: int
    investimento_total: float
    ticket_medio: float
    sequencia_invicta_atual: int
    por_estadio: dict[str, dict]
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class PartidaBase(BaseModel):
    data_jogo: date
    competicao: str = Field(..., min_length=2, max_length=80)
    adversario: str = Field(..., min_length=2, max_length=100)
    adversario_logo: Optional[str] = Field(None, max_length=255)
    mando: str = Field(..., pattern="^(Casa|Fora|Neutro)$")
    estadio: str = Field(..., min_length=2, max_length=100)
    setor: Optional[str] = Field(None, max_length=60)
    gols_vasco: int = Field(default=0, ge=0)
    gols_adversario: int = Field(default=0, ge=0)
    valor_ingresso: float = Field(default=0.0, ge=0)
    valor_extras: float = Field(default=0.0, ge=0)
    observacoes: Optional[str] = None
    fui: bool = True
    status_jogo: str = Field(default="finalizado", pattern="^(agendado|ao_vivo|finalizado)$")


class PartidaCreate(PartidaBase):
    pass


class PartidaUpdate(BaseModel):
    data_jogo: Optional[date] = None
    competicao: Optional[str] = None
    adversario: Optional[str] = None
    adversario_logo: Optional[str] = None
    mando: Optional[str] = Field(None, pattern="^(Casa|Fora|Neutro)$")
    estadio: Optional[str] = None
    setor: Optional[str] = None
    gols_vasco: Optional[int] = Field(None, ge=0)
    gols_adversario: Optional[int] = Field(None, ge=0)
    valor_ingresso: Optional[float] = Field(None, ge=0)
    valor_extras: Optional[float] = Field(None, ge=0)
    observacoes: Optional[str] = None
    fui: Optional[bool] = None
    status_jogo: Optional[str] = Field(None, pattern="^(agendado|ao_vivo|finalizado)$")


class CheckinUpdate(BaseModel):
    fui: bool = True
    valor_ingresso: float = Field(default=0.0, ge=0)
    valor_extras: float = Field(default=0.0, ge=0)
    observacoes: Optional[str] = None


class PartidaResponse(PartidaBase):
    id: int
    external_id: Optional[str] = None
    resultado: str  # V, E, D ou - (para jogos agendados)
    custo_total: float
    gols_detalhes: Optional[dict] = None

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
    sequencia_vitorias_atual: int = 0
    maior_sequencia_invicta: int = 0
    maior_sequencia_vitorias: int = 0
    maior_vitoria: Optional[dict] = None
    estadio_mais_visitado: Optional[dict] = None
    ultimo_resultado: Optional[dict] = None
    por_estadio: dict[str, dict]
    por_competicao: dict[str, dict] = {}
    por_mando: dict[str, dict] = {}
    ranking_adversarios: list[dict] = []
    jogadores_mais_vistos: list[dict] = []
    artilheiros_vasco: list[dict] = []
    assistencias_vasco: list[dict] = []
    participacoes_gols: list[dict] = []
    heatmap_presenca: list[dict] = []
    total_sincronizados: int = 0
    total_pendentes: int = 0


class SyncResponse(BaseModel):
    criados: int
    atualizados: int
    total_recebidos: int

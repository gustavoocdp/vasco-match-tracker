from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.models import Partida
from app.schemas import PartidaCreate, PartidaUpdate, PartidaResponse, EstatisticasResponse
from app.security import verificar_admin

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vasco Match Tracker API",
    description="API para controle de presença, retrospecto e finanças em jogos do CR Vasco da Gama.",
    version="1.0.0"
)

origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def formatar_partida(p: Partida) -> dict:
    if p.gols_vasco > p.gols_adversario:
        res = "V"
    elif p.gols_vasco == p.gols_adversario:
        res = "E"
    else:
        res = "D"

    return {
        "id": p.id,
        "data_jogo": p.data_jogo,
        "competicao": p.competicao,
        "adversario": p.adversario,
        "mando": p.mando,
        "estadio": p.estadio,
        "setor": p.setor,
        "gols_vasco": p.gols_vasco,
        "gols_adversario": p.gols_adversario,
        "valor_ingresso": p.valor_ingresso,
        "valor_extras": p.valor_extras,
        "companhia": p.companhia,
        "observacoes": p.observacoes,
        "resultado": res,
        "custo_total": round((p.valor_ingresso or 0) + (p.valor_extras or 0), 2)
    }

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "online", "clube": "Club de Regatas Vasco da Gama"}

@app.get("/partidas", response_model=List[PartidaResponse], tags=["Partidas"])
def listar_partidas(
    ano: Optional[int] = None,
    estadio: Optional[str] = None,
    competicao: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Partida)
    if estadio:
        query = query.filter(Partida.estadio.ilike(f"%{estadio}%"))
    if competicao:
        query = query.filter(Partida.competicao.ilike(f"%{competicao}%"))

    partidas = query.order_by(Partida.data_jogo.desc()).all()

    if ano:
        partidas = [p for p in partidas if p.data_jogo.year == ano]

    return [formatar_partida(p) for p in partidas]

@app.post(
    "/partidas",
    response_model=PartidaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verificar_admin)],
    tags=["Partidas"]
)
def criar_partida(payload: PartidaCreate, db: Session = Depends(get_db)):
    nova = Partida(**payload.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return formatar_partida(nova)

@app.put(
    "/partidas/{partida_id}",
    response_model=PartidaResponse,
    dependencies=[Depends(verificar_admin)],
    tags=["Partidas"]
)
def atualizar_partida(partida_id: int, payload: PartidaUpdate, db: Session = Depends(get_db)):
    partida = db.query(Partida).filter(Partida.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(partida, campo, valor)

    db.commit()
    db.refresh(partida)
    return formatar_partida(partida)

@app.delete(
    "/partidas/{partida_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verificar_admin)],
    tags=["Partidas"]
)
def deletar_partida(partida_id: int, db: Session = Depends(get_db)):
    partida = db.query(Partida).filter(Partida.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")

    db.delete(partida)
    db.commit()

@app.get("/estatisticas", response_model=EstatisticasResponse, tags=["Analytics"])
def obter_estatisticas(ano: Optional[int] = None, db: Session = Depends(get_db)):
    partidas = db.query(Partida).order_by(Partida.data_jogo.desc()).all()
    if ano:
        partidas = [p for p in partidas if p.data_jogo.year == ano]

    total = len(partidas)
    vitorias = sum(1 for p in partidas if p.gols_vasco > p.gols_adversario)
    empates = sum(1 for p in partidas if p.gols_vasco == p.gols_adversario)
    derrotas = total - vitorias - empates

    pontos_conquistados = (vitorias * 3) + empates
    pontos_possiveis = total * 3
    aproveitamento = round((pontos_conquistados / pontos_possiveis * 100), 1) if pontos_possiveis > 0 else 0.0

    gols_pro = sum(p.gols_vasco for p in partidas)
    gols_contra = sum(p.gols_adversario for p in partidas)

    investimento = round(sum((p.valor_ingresso or 0) + (p.valor_extras or 0) for p in partidas), 2)
    ticket_medio = round(investimento / total, 2) if total > 0 else 0.0

    # Sequência invicta atual (partidas ordenadas da mais recente para a mais antiga)
    invicto = 0
    for p in partidas:
        if p.gols_vasco >= p.gols_adversario:
            invicto += 1
        else:
            break

    # Agrupamento por estádio
    por_estadio = {}
    for p in partidas:
        est = p.estadio
        if est not in por_estadio:
            por_estadio[est] = {"jogos": 0, "vitorias": 0, "empates": 0, "derrotas": 0}
        por_estadio[est]["jogos"] += 1
        if p.gols_vasco > p.gols_adversario:
            por_estadio[est]["vitorias"] += 1
        elif p.gols_vasco == p.gols_adversario:
            por_estadio[est]["empates"] += 1
        else:
            por_estadio[est]["derrotas"] += 1

    return {
        "total_jogos": total,
        "vitorias": vitorias,
        "empates": empates,
        "derrotas": derrotas,
        "aproveitamento_percentual": aproveitamento,
        "gols_pro": gols_pro,
        "gols_contra": gols_contra,
        "saldo_gols": gols_pro - gols_contra,
        "investimento_total": investimento,
        "ticket_medio": ticket_medio,
        "sequencia_invicta_atual": invicto,
        "por_estadio": por_estadio
    }
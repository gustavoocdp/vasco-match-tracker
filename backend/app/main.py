from datetime import date, datetime
import json
import os
from typing import List, Optional
from fastapi import Body, FastAPI, Depends, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, ensure_schema_columns, get_db
from app.models import Partida
from app.schemas import (
    CheckinUpdate,
    EstatisticasResponse,
    PartidaCreate,
    PartidaResponse,
    PartidaUpdate,
    SyncResponse,
)
from app.security import verificar_admin
from app.sync import (
    BRT_TZ,
    _norm_nome_jogador,
    _normalizar_estadio,
    buscar_elenco_365scores,
    buscar_gols_partida_espn,
    buscar_jogadores_365_em_lote,
    enriquecer_gols_partidas,
    importar_historico_2019_2024,
    sincronizar_jogos_vasco,
    vincular_partidas_manuais_espn,
)

Base.metadata.create_all(bind=engine)
ensure_schema_columns()

app = FastAPI(
    title="VasCheckin API",
    description="API para controle de presença, retrospecto e finanças em jogos do CR Vasco da Gama.",
    version="2.0.0",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def formatar_partida(p: Partida) -> dict:
    if p.status_jogo != "finalizado":
        res = "-"
    elif p.gols_vasco > p.gols_adversario:
        res = "V"
    elif p.gols_vasco == p.gols_adversario:
        res = "E"
    else:
        res = "D"

    gols_detalhes = None
    if p.gols_detalhes:
        try:
            gols_detalhes = json.loads(p.gols_detalhes)
        except Exception:
            gols_detalhes = None

    return {
        "id": p.id,
        "external_id": p.external_id,
        "data_jogo": p.data_jogo,
        "competicao": p.competicao,
        "adversario": p.adversario,
        "adversario_logo": p.adversario_logo,
        "mando": p.mando,
        "estadio": _normalizar_estadio(p.estadio),
        "setor": p.setor,
        "gols_vasco": p.gols_vasco,
        "gols_adversario": p.gols_adversario,
        "valor_ingresso": p.valor_ingresso or 0.0,
        "valor_extras": p.valor_extras or 0.0,
        "observacoes": p.observacoes,
        "fui": bool(p.fui),
        "status_jogo": p.status_jogo or "finalizado",
        "resultado": res,
        "custo_total": round((p.valor_ingresso or 0) + (p.valor_extras or 0), 2),
        "gols_detalhes": gols_detalhes,
    }


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "online", "clube": "Club de Regatas Vasco da Gama"}


@app.get("/partidas", response_model=List[PartidaResponse], tags=["Partidas"])
def listar_partidas(
    ano: Optional[int] = None,
    estadio: Optional[str] = None,
    competicao: Optional[str] = None,
    fui: Optional[bool] = None,
    incluir_futuros: bool = False,
    db: Session = Depends(get_db),
):
    # Auto-sincroniza na primeira execução caso ainda não haja jogos sincronizados
    tem_sincronizados = db.query(Partida.id).filter(Partida.external_id.isnot(None)).first()
    if not tem_sincronizados:
        try:
            sincronizar_jogos_vasco(db)
        except Exception:
            pass

    # Garante importação única do histórico 2019-2024 caso ainda não esteja no banco
    tem_historico_antigo = db.query(Partida.id).filter(Partida.external_id == "537072").first()
    if not tem_historico_antigo:
        try:
            importar_historico_2019_2024(db)
        except Exception:
            pass

    query = db.query(Partida)
    if estadio:
        query = query.filter(Partida.estadio.ilike(f"%{estadio}%"))
    if competicao:
        query = query.filter(Partida.competicao.ilike(f"%{competicao}%"))
    if fui is not None:
        query = query.filter(Partida.fui == fui)
    if not incluir_futuros:
        hoje = datetime.now(BRT_TZ).date()
        query = query.filter(Partida.data_jogo <= hoje)

    partidas = query.order_by(Partida.data_jogo.desc()).all()

    if ano:
        partidas = [p for p in partidas if p.data_jogo.year == ano]

    if fui is True:
        enriquecer_gols_partidas(db, partidas, limite=5)

    return [formatar_partida(p) for p in partidas]


@app.post(
    "/partidas",
    response_model=PartidaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verificar_admin)],
    tags=["Partidas"],
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
    tags=["Partidas"],
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


@app.patch(
    "/partidas/{partida_id}/checkin",
    response_model=PartidaResponse,
    dependencies=[Depends(verificar_admin)],
    tags=["Check-in"],
)
def checkin_partida(partida_id: int, payload: CheckinUpdate, db: Session = Depends(get_db)):
    partida = db.query(Partida).filter(Partida.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")

    partida.fui = payload.fui
    if payload.fui:
        partida.valor_ingresso = payload.valor_ingresso
        partida.valor_extras = payload.valor_extras
        partida.observacoes = payload.observacoes
        if (
            partida.external_id
            and (partida.status_jogo or "finalizado") == "finalizado"
            and partida.gols_detalhes is None
        ):
            try:
                detalhes = buscar_gols_partida_espn(partida.external_id)
                if detalhes is not None:
                    partida.gols_detalhes = json.dumps(detalhes, ensure_ascii=False)
            except Exception:
                pass
    else:
        partida.setor = None
        partida.valor_ingresso = 0.0
        partida.valor_extras = 0.0
        partida.observacoes = None

    db.commit()
    db.refresh(partida)
    return formatar_partida(partida)


@app.delete(
    "/partidas/{partida_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verificar_admin)],
    tags=["Partidas"],
)
def deletar_partida(partida_id: int, db: Session = Depends(get_db)):
    partida = db.query(Partida).filter(Partida.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")

    db.delete(partida)
    db.commit()


@app.post(
    "/sync",
    response_model=SyncResponse,
    dependencies=[Depends(verificar_admin)],
    tags=["Sync"],
)
def sincronizar_manual(season: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        vincular_partidas_manuais_espn(db)
        return sincronizar_jogos_vasco(db, season=season)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao sincronizar jogos: {exc}")


@app.post(
    "/sync/historico",
    dependencies=[Depends(verificar_admin)],
    tags=["Sync"],
)
def sincronizar_historico(db: Session = Depends(get_db)):
    try:
        return importar_historico_2019_2024(db)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao importar histórico: {exc}")


@app.get("/cron/sync", response_model=SyncResponse, tags=["Sync"])
def sincronizar_cron(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret and authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Não autorizado.")
    try:
        return sincronizar_jogos_vasco(db)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao sincronizar jogos: {exc}")


@app.get(
    "/backup/json",
    dependencies=[Depends(verificar_admin)],
    tags=["Backup"],
)
def exportar_backup_json(db: Session = Depends(get_db)):
    partidas = db.query(Partida).order_by(Partida.data_jogo.desc()).all()
    payload = {
        "app": "VasCheckin",
        "exported_at": datetime.now(BRT_TZ).isoformat(),
        "total": len(partidas),
        "partidas": [
            {
                "external_id": p.external_id,
                "data_jogo": p.data_jogo.isoformat(),
                "competicao": p.competicao,
                "adversario": p.adversario,
                "adversario_logo": p.adversario_logo,
                "mando": p.mando,
                "estadio": p.estadio,
                "gols_vasco": p.gols_vasco,
                "gols_adversario": p.gols_adversario,
                "valor_ingresso": p.valor_ingresso or 0.0,
                "valor_extras": p.valor_extras or 0.0,
                "observacoes": p.observacoes,
                "fui": bool(p.fui),
                "status_jogo": p.status_jogo or "finalizado",
                "gols_detalhes": json.loads(p.gols_detalhes) if p.gols_detalhes else None,
            }
            for p in partidas
        ],
    }
    conteudo = json.dumps(payload, ensure_ascii=False, indent=2)
    nome_arquivo = f"vascheckin-backup-{datetime.now(BRT_TZ).date().isoformat()}.json"
    return Response(
        content=conteudo,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )


@app.post(
    "/backup/restore",
    dependencies=[Depends(verificar_admin)],
    tags=["Backup"],
)
def restaurar_backup_json(payload: dict = Body(...), db: Session = Depends(get_db)):
    itens = payload.get("partidas") or []
    criados = 0
    atualizados = 0

    for item in itens:
        ext_id = item.get("external_id")
        data_jogo_val = date.fromisoformat(item["data_jogo"])
        existente = None
        if ext_id:
            existente = db.query(Partida).filter(Partida.external_id == ext_id).first()
        if not existente:
            existente = (
                db.query(Partida)
                .filter(Partida.data_jogo == data_jogo_val, Partida.adversario == item["adversario"])
                .first()
            )

        gols_det = item.get("gols_detalhes")
        gols_det_str = json.dumps(gols_det, ensure_ascii=False) if isinstance(gols_det, dict) else None

        if existente:
            existente.fui = bool(item.get("fui", existente.fui))
            existente.valor_ingresso = float(item.get("valor_ingresso", existente.valor_ingresso or 0.0))
            existente.valor_extras = float(item.get("valor_extras", existente.valor_extras or 0.0))
            existente.observacoes = item.get("observacoes", existente.observacoes)
            if gols_det_str and not existente.gols_detalhes:
                existente.gols_detalhes = gols_det_str
            atualizados += 1
        else:
            nova = Partida(
                external_id=ext_id,
                data_jogo=data_jogo_val,
                competicao=item["competicao"],
                adversario=item["adversario"],
                adversario_logo=item.get("adversario_logo"),
                mando=item["mando"],
                estadio=item["estadio"],
                gols_vasco=int(item.get("gols_vasco", 0)),
                gols_adversario=int(item.get("gols_adversario", 0)),
                valor_ingresso=float(item.get("valor_ingresso", 0.0)),
                valor_extras=float(item.get("valor_extras", 0.0)),
                observacoes=item.get("observacoes"),
                fui=bool(item.get("fui", True)),
                status_jogo=item.get("status_jogo", "finalizado"),
                gols_detalhes=gols_det_str,
            )
            db.add(nova)
            criados += 1

    db.commit()
    return {"criados": criados, "atualizados": atualizados, "total_processados": len(itens)}


@app.get("/estatisticas", response_model=EstatisticasResponse, tags=["Analytics"])
def obter_estatisticas(ano: Optional[int] = None, db: Session = Depends(get_db)):
    todas = db.query(Partida).order_by(Partida.data_jogo.desc()).all()
    if ano:
        todas = [p for p in todas if p.data_jogo.year == ano]

    presentes = [p for p in todas if p.fui]
    finalizadas_presentes = [p for p in presentes if (p.status_jogo or "finalizado") == "finalizado"]

    if any(p.external_id is None for p in finalizadas_presentes):
        try:
            res_vinc = vincular_partidas_manuais_espn(db)
            if res_vinc.get("vinculados") or res_vinc.get("mesclados"):
                todas = db.query(Partida).order_by(Partida.data_jogo.desc()).all()
                if ano:
                    todas = [p for p in todas if p.data_jogo.year == ano]
                presentes = [p for p in todas if p.fui]
                finalizadas_presentes = [p for p in presentes if (p.status_jogo or "finalizado") == "finalizado"]
        except Exception:
            pass

    enriquecer_gols_partidas(db, finalizadas_presentes, limite=12)

    total = len(finalizadas_presentes)
    vitorias = sum(1 for p in finalizadas_presentes if p.gols_vasco > p.gols_adversario)
    empates = sum(1 for p in finalizadas_presentes if p.gols_vasco == p.gols_adversario)
    derrotas = total - vitorias - empates

    pontos_conquistados = (vitorias * 3) + empates
    pontos_possiveis = total * 3
    aproveitamento = round((pontos_conquistados / pontos_possiveis * 100), 1) if pontos_possiveis > 0 else 0.0

    gols_pro = sum(p.gols_vasco for p in finalizadas_presentes)
    gols_contra = sum(p.gols_adversario for p in finalizadas_presentes)

    investimento = round(sum((p.valor_ingresso or 0) + (p.valor_extras or 0) for p in presentes), 2)
    ticket_medio = round(investimento / len(presentes), 2) if presentes else 0.0

    # Sequências atuais (da mais recente para a mais antiga)
    invicto = 0
    for p in finalizadas_presentes:
        if p.gols_vasco >= p.gols_adversario:
            invicto += 1
        else:
            break

    vitorias_atual = 0
    for p in finalizadas_presentes:
        if p.gols_vasco > p.gols_adversario:
            vitorias_atual += 1
        else:
            break

    # Recordes históricos (ordem cronológica: da mais antiga para a mais recente)
    maior_invicta = 0
    maior_vitorias = 0
    seq_inv_tmp = 0
    seq_vit_tmp = 0
    maior_vitoria = None
    melhor_saldo = -1

    for p in reversed(finalizadas_presentes):
        if p.gols_vasco >= p.gols_adversario:
            seq_inv_tmp += 1
            if seq_inv_tmp > maior_invicta:
                maior_invicta = seq_inv_tmp
        else:
            seq_inv_tmp = 0

        if p.gols_vasco > p.gols_adversario:
            seq_vit_tmp += 1
            if seq_vit_tmp > maior_vitorias:
                maior_vitorias = seq_vit_tmp
            saldo = p.gols_vasco - p.gols_adversario
            if saldo > melhor_saldo or (
                saldo == melhor_saldo
                and maior_vitoria is not None
                and p.gols_vasco > maior_vitoria["gols_vasco"]
            ):
                melhor_saldo = saldo
                maior_vitoria = {
                    "adversario": p.adversario,
                    "placar": f"{p.gols_vasco} x {p.gols_adversario}",
                    "gols_vasco": p.gols_vasco,
                    "data_jogo": p.data_jogo.isoformat(),
                }
        else:
            seq_vit_tmp = 0

    def _acumular_grupo(mapa: dict, chave: str, p: Partida):
        if chave not in mapa:
            mapa[chave] = {"jogos": 0, "vitorias": 0, "empates": 0, "derrotas": 0}
        mapa[chave]["jogos"] += 1
        if p.gols_vasco > p.gols_adversario:
            mapa[chave]["vitorias"] += 1
        elif p.gols_vasco == p.gols_adversario:
            mapa[chave]["empates"] += 1
        else:
            mapa[chave]["derrotas"] += 1

    # Agrupamento por estádio, competição, mando e estatísticas de jogadores
    por_estadio = {}
    por_competicao = {}
    por_mando = {}
    adversarios_map = {}
    jogos_por_jogador: dict[str, int] = {}
    gols_por_jogador: dict[str, int] = {}
    assists_por_jogador: dict[str, int] = {}
    info_por_jogador: dict[str, dict] = {}

    for p in finalizadas_presentes:
        _acumular_grupo(por_estadio, _normalizar_estadio(p.estadio), p)
        _acumular_grupo(por_competicao, p.competicao, p)
        _acumular_grupo(por_mando, p.mando, p)

        if p.gols_detalhes:
            try:
                det = json.loads(p.gols_detalhes)
            except Exception:
                det = {}

            for nome_info, meta in (det.get("jogadores_info") or {}).items():
                if nome_info not in info_por_jogador:
                    info_por_jogador[nome_info] = meta

            for nome in det.get("elenco_vasco") or []:
                jogos_por_jogador[nome] = jogos_por_jogador.get(nome, 0) + 1

            for gol in det.get("vasco") or []:
                nome_gol = (gol.get("jogador") or "").strip()
                if not nome_gol or "(GC)" in nome_gol:
                    continue
                nome_limpo = nome_gol.replace(" (P)", "").strip()
                gols_por_jogador[nome_limpo] = gols_por_jogador.get(nome_limpo, 0) + 1

            for ast in det.get("assistencias_vasco") or []:
                nome_ast = (ast.get("jogador") or "").strip()
                qtd_ast = int(ast.get("assistencias") or 0)
                if nome_ast and qtd_ast > 0:
                    assists_por_jogador[nome_ast] = assists_por_jogador.get(nome_ast, 0) + qtd_ast

        adv = p.adversario
        if adv not in adversarios_map:
            adversarios_map[adv] = {
                "adversario": adv,
                "adversario_logo": p.adversario_logo,
                "jogos": 0,
                "vitorias": 0,
                "empates": 0,
                "derrotas": 0,
                "gols_pro": 0,
                "gols_contra": 0,
            }
        item = adversarios_map[adv]
        if not item["adversario_logo"] and p.adversario_logo:
            item["adversario_logo"] = p.adversario_logo
        item["jogos"] += 1
        item["gols_pro"] += p.gols_vasco
        item["gols_contra"] += p.gols_adversario
        if p.gols_vasco > p.gols_adversario:
            item["vitorias"] += 1
        elif p.gols_vasco == p.gols_adversario:
            item["empates"] += 1
        else:
            item["derrotas"] += 1

    por_competicao_ordenado = dict(
        sorted(por_competicao.items(), key=lambda x: x[1]["jogos"], reverse=True)
    )
    ranking_adversarios = sorted(
        adversarios_map.values(),
        key=lambda x: (x["jogos"], x["vitorias"], x["gols_pro"] - x["gols_contra"]),
        reverse=True,
    )

    estadio_mais_visitado = None
    if por_estadio:
        nome_top, dados_top = max(por_estadio.items(), key=lambda x: x[1]["jogos"])
        estadio_mais_visitado = {"nome": nome_top, "jogos": dados_top["jogos"]}

    ultimo_resultado = None
    if finalizadas_presentes:
        ult = finalizadas_presentes[0]
        res_ult = "V" if ult.gols_vasco > ult.gols_adversario else ("E" if ult.gols_vasco == ult.gols_adversario else "D")
        ultimo_resultado = {
            "resultado": res_ult,
            "placar": f"{ult.gols_vasco} x {ult.gols_adversario}",
            "adversario": ult.adversario,
        }

    try:
        elenco_365 = buscar_elenco_365scores()
    except Exception:
        elenco_365 = {}

    top_vistos_raw = sorted(jogos_por_jogador.items(), key=lambda x: (-x[1], x[0]))[:10]
    top_art_raw = sorted(gols_por_jogador.items(), key=lambda x: (-x[1], x[0]))[:10]
    top_ast_raw = sorted(assists_por_jogador.items(), key=lambda x: (-x[1], x[0]))[:10]

    todos_ga = set(gols_por_jogador.keys()) | set(assists_por_jogador.keys())
    top_ga_raw = sorted(
        todos_ga,
        key=lambda nome: (
            -(gols_por_jogador.get(nome, 0) + assists_por_jogador.get(nome, 0)),
            -gols_por_jogador.get(nome, 0),
            nome,
        ),
    )[:10]

    nomes_destaque = (
        [n for n, _ in top_vistos_raw[:5]]
        + [n for n, _ in top_art_raw[:5]]
        + [n for n, _ in top_ast_raw[:5]]
        + top_ga_raw[:5]
    )
    faltantes_365 = [n for n in dict.fromkeys(nomes_destaque) if _norm_nome_jogador(n) not in elenco_365]
    try:
        extras_365 = buscar_jogadores_365_em_lote(faltantes_365) if faltantes_365 else {}
    except Exception:
        extras_365 = {}

    def _meta_jogador(nome: str) -> dict:
        meta_espn = info_por_jogador.get(nome) or {}
        chave = _norm_nome_jogador(nome)
        meta_365 = elenco_365.get(chave) or extras_365.get(chave) or {}
        pos_espn = meta_espn.get("pos") or "JOG"
        pos_365 = meta_365.get("pos") or "JOG"
        posicao = pos_365 if pos_espn == "JOG" and pos_365 != "JOG" else pos_espn
        foto = meta_365.get("foto") or meta_espn.get("foto")
        return {"posicao": posicao, "foto": foto}

    jogadores_mais_vistos = [
        {"jogador": nome, "jogos": qtd, **_meta_jogador(nome)}
        for nome, qtd in top_vistos_raw
    ]
    artilheiros_vasco = [
        {"jogador": nome, "gols": qtd, **_meta_jogador(nome)}
        for nome, qtd in top_art_raw
    ]
    assistencias_vasco = [
        {"jogador": nome, "assistencias": qtd, **_meta_jogador(nome)}
        for nome, qtd in top_ast_raw
    ]
    participacoes_gols = [
        {
            "jogador": nome,
            "gols": gols_por_jogador.get(nome, 0),
            "assistencias": assists_por_jogador.get(nome, 0),
            "total": gols_por_jogador.get(nome, 0) + assists_por_jogador.get(nome, 0),
            **_meta_jogador(nome),
        }
        for nome in top_ga_raw
    ]

    heatmap_presenca = []
    for p in reversed(finalizadas_presentes):
        res_h = "V" if p.gols_vasco > p.gols_adversario else ("E" if p.gols_vasco == p.gols_adversario else "D")
        heatmap_presenca.append(
            {
                "data_jogo": p.data_jogo.isoformat(),
                "resultado": res_h,
                "adversario": p.adversario,
                "placar": f"{p.gols_vasco} x {p.gols_adversario}",
                "estadio": _normalizar_estadio(p.estadio),
            }
        )

    hoje = datetime.now(BRT_TZ).date()
    elegiveis_checkin = [p for p in todas if p.data_jogo <= hoje]

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
        "sequencia_vitorias_atual": vitorias_atual,
        "maior_sequencia_invicta": maior_invicta,
        "maior_sequencia_vitorias": maior_vitorias,
        "maior_vitoria": maior_vitoria,
        "estadio_mais_visitado": estadio_mais_visitado,
        "ultimo_resultado": ultimo_resultado,
        "por_estadio": por_estadio,
        "por_competicao": por_competicao_ordenado,
        "por_mando": por_mando,
        "ranking_adversarios": ranking_adversarios,
        "jogadores_mais_vistos": jogadores_mais_vistos,
        "artilheiros_vasco": artilheiros_vasco,
        "assistencias_vasco": assistencias_vasco,
        "participacoes_gols": participacoes_gols,
        "heatmap_presenca": heatmap_presenca,
        "total_sincronizados": len(elegiveis_checkin),
        "total_pendentes": sum(1 for p in elegiveis_checkin if not p.fui),
    }

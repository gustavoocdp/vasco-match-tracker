from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import re
from typing import Optional
import unicodedata
import urllib.parse
import urllib.request
from sqlalchemy.orm import Session

from app.models import Partida

VASCO_ESPN_ID = "3454"
ESPN_BASE_URL = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/{VASCO_ESPN_ID}/schedule"
ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
BRT_TZ = timezone(timedelta(hours=-3))


def _fetch_espn_events(fixture: bool = False, season: Optional[int] = None) -> list[dict]:
    params = []
    if fixture:
        params.append("fixture=true")
    if season:
        params.append(f"season={season}")
    url = ESPN_BASE_URL + (f"?{'&'.join(params)}" if params else "")

    req = urllib.request.Request(url, headers={"User-Agent": "VascoMatchTracker/2.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data.get("events", [])


def _normalizar_competicao(raw_name: str, season_display: str = "") -> str:
    combinado = f"{season_display} {raw_name}".strip().lower()
    if "serie a" in combinado or "brasileir" in combinado:
        return "Brasileirão"
    if "copa do brasil" in combinado:
        return "Copa do Brasil"
    if "carioca" in combinado:
        return "Carioca"
    if "sudamericana" in combinado or "sul-americana" in combinado:
        return "Sul-Americana"
    if "libertadores" in combinado:
        return "Copa Libertadores"
    if "friendly" in combinado or "amistoso" in combinado:
        return "Amistoso"

    base = (season_display or raw_name or "").strip()
    limpo = re.sub(r"^\d{4}\s+", "", base).strip()
    return (limpo or "Outro")[:80]


def _normalizar_estadio(raw_estadio: str) -> str:
    nome = (raw_estadio or "").strip()
    lower = nome.lower()
    if "joao havelange" in lower or "joão havelange" in lower or "nilton santos" in lower:
        return "Estádio Nilton Santos (Engenhão)"
    if lower == "maracana" or lower == "estadio do maracana":
        return "Maracanã"
    if "sao januario" in lower or "são januário" in lower:
        return "São Januário"
    if "cicero de souza marques" in lower:
        return "Estádio Municipal Cícero de Souza Marques"
    return (nome or "A definir")[:100]


def _normalizar_posicao(pos_obj: Optional[dict]) -> str:
    if not pos_obj:
        return "JOG"
    abbr = (pos_obj.get("abbreviation") or "").upper().strip()
    name = (pos_obj.get("name") or "").lower()

    if abbr in ("G", "GK") or "goalkeeper" in name:
        return "GOL"
    if abbr in ("LB", "LWB") or "left back" in name or "left wingback" in name:
        return "LE"
    if abbr in ("RB", "RWB") or "right back" in name or "right wingback" in name:
        return "LD"
    if abbr.startswith("CD") or abbr in ("CB", "D", "SW") or "defender" in name:
        return "ZAG"
    if abbr in ("DM", "CDM") or "defensive midfielder" in name:
        return "VOL"
    if abbr in ("M", "CM", "AM", "LM", "RM", "CAM") or "midfielder" in name:
        return "MEI"
    if abbr in ("F", "CF", "ST", "LW", "RW", "LF", "RF") or "forward" in name or "striker" in name or "winger" in name:
        return "ATA"
    return "JOG"


def _parse_espn_event(event: dict) -> Optional[dict]:
    competitions = event.get("competitions") or []
    if not competitions:
        return None
    comp = competitions[0]
    competitors = comp.get("competitors") or []
    if len(competitors) < 2:
        return None

    vasco_comp = None
    adv_comp = None
    for c in competitors:
        team_id = str((c.get("team") or {}).get("id", ""))
        if team_id == VASCO_ESPN_ID:
            vasco_comp = c
        else:
            adv_comp = c

    if not vasco_comp or not adv_comp:
        return None

    # Data em horário de Brasília (UTC-3)
    raw_date = comp.get("date") or event.get("date")
    if not raw_date:
        return None
    dt_utc = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
    data_jogo = dt_utc.astimezone(BRT_TZ).date()

    # Status
    status_type = (comp.get("status") or {}).get("type") or {}
    state = status_type.get("state", "post")
    completed = bool(status_type.get("completed", False))
    if completed or state == "post":
        status_jogo = "finalizado"
    elif state == "in":
        status_jogo = "ao_vivo"
    else:
        status_jogo = "agendado"

    # Mando
    if comp.get("neutralSite"):
        mando = "Neutro"
    elif vasco_comp.get("homeAway") == "home":
        mando = "Casa"
    else:
        mando = "Fora"

    # Placar
    def _extrair_gols(c: dict) -> int:
        score = c.get("score")
        if isinstance(score, dict) and score.get("value") is not None:
            return max(0, int(score["value"]))
        if isinstance(score, (int, float)):
            return max(0, int(score))
        return 0

    gols_vasco = _extrair_gols(vasco_comp)
    gols_adversario = _extrair_gols(adv_comp)

    adv_team = adv_comp.get("team") or {}
    adversario = (adv_team.get("shortDisplayName") or adv_team.get("displayName") or "Adversário")[:100]
    logos = adv_team.get("logos") or []
    adversario_logo = logos[0].get("href") if logos and isinstance(logos[0], dict) else None

    venue = comp.get("venue") or {}
    estadio = _normalizar_estadio(venue.get("fullName") or "")

    season_type = event.get("seasonType") or {}
    season_info = event.get("season") or {}
    competicao = _normalizar_competicao(
        season_type.get("name") or season_type.get("abbreviation") or "",
        season_info.get("displayName") or "",
    )

    return {
        "external_id": str(event.get("id")),
        "data_jogo": data_jogo,
        "competicao": competicao,
        "adversario": adversario,
        "adversario_logo": adversario_logo,
        "mando": mando,
        "estadio": estadio,
        "gols_vasco": gols_vasco,
        "gols_adversario": gols_adversario,
        "status_jogo": status_jogo,
    }


def sincronizar_jogos_vasco(db: Session, season: Optional[int] = None) -> dict:
    """Busca jogos passados e futuros do Vasco na ESPN e faz upsert no banco."""
    eventos_passados = _fetch_espn_events(fixture=False, season=season)
    eventos_futuros = _fetch_espn_events(fixture=True, season=season)

    # Deduplica por ID mantendo o mais recente
    por_id: dict[str, dict] = {}
    for ev in eventos_passados + eventos_futuros:
        ev_id = str(ev.get("id") or "")
        if ev_id:
            por_id[ev_id] = ev

    criados = 0
    atualizados = 0

    for ev in por_id.values():
        parsed = _parse_espn_event(ev)
        if not parsed:
            continue

        existente = db.query(Partida).filter(Partida.external_id == parsed["external_id"]).first()
        if existente:
            existente.data_jogo = parsed["data_jogo"]
            existente.competicao = parsed["competicao"]
            existente.adversario = parsed["adversario"]
            existente.adversario_logo = parsed["adversario_logo"]
            existente.mando = parsed["mando"]
            existente.estadio = parsed["estadio"]
            existente.gols_vasco = parsed["gols_vasco"]
            existente.gols_adversario = parsed["gols_adversario"]
            existente.status_jogo = parsed["status_jogo"]
            atualizados += 1
        else:
            nova = Partida(
                **parsed,
                fui=False,
                valor_ingresso=0.0,
                valor_extras=0.0,
            )
            db.add(nova)
            criados += 1

    db.commit()
    return {
        "criados": criados,
        "atualizados": atualizados,
        "total_recebidos": len(por_id),
    }


def buscar_gols_partida_espn(external_id: str) -> Optional[dict]:
    """Busca autores dos gols, assistências e elenco do Vasco que atuou na partida."""
    if not external_id:
        return None
    url = ESPN_SUMMARY_URL.format(event_id=external_id)
    req = urllib.request.Request(url, headers={"User-Agent": "VasCheckin/2.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    gols_vasco = []
    gols_adv = []
    assist_por_texto: dict[str, int] = {}

    for ev in data.get("keyEvents", []):
        if not ev.get("scoringPlay") or ev.get("shootout"):
            continue
        participants = ev.get("participants") or []
        athlete = (participants[0].get("athlete") or {}) if participants else {}
        jogador = athlete.get("displayName") or athlete.get("shortName") or "Gol"
        minuto = ((ev.get("clock") or {}).get("displayValue") or "").strip()

        ev_type = ((ev.get("type") or {}).get("type") or "").lower()
        if "penalty" in ev_type:
            jogador = f"{jogador} (P)"
        elif "own-goal" in ev_type:
            jogador = f"{jogador} (GC)"

        item = {"jogador": jogador, "minuto": minuto}
        team_id = str((ev.get("team") or {}).get("id") or "")
        if team_id == VASCO_ESPN_ID:
            gols_vasco.append(item)
            ev_text = ev.get("text") or ""
            m_assist = re.search(r"Assisted by ([^.]+?)(?:\s+with|\s+following|\s+from|\.)", ev_text)
            if m_assist:
                nome_assist = m_assist.group(1).strip()
                if nome_assist:
                    assist_por_texto[nome_assist] = assist_por_texto.get(nome_assist, 0) + 1
        else:
            gols_adv.append(item)

    elenco_vasco: list[str] = []
    titulares_vasco: list[str] = []
    reservas_vasco: list[str] = []
    assist_por_stats: dict[str, int] = {}
    jogadores_info: dict[str, dict] = {}

    for roster_team in data.get("rosters", []):
        if str((roster_team.get("team") or {}).get("id") or "") != VASCO_ESPN_ID:
            continue
        for player in roster_team.get("roster") or []:
            athlete = player.get("athlete") or {}
            nome = athlete.get("displayName") or athlete.get("shortName")
            if not nome:
                continue

            athlete_id = str(athlete.get("id") or "").strip()
            headshot_obj = athlete.get("headshot") or {}
            foto_url = headshot_obj.get("href") or (
                f"https://a.espncdn.com/i/headshots/soccer/players/full/{athlete_id}.png"
                if athlete_id
                else None
            )
            pos_sigla = _normalizar_posicao(player.get("position"))
            if nome not in jogadores_info:
                jogadores_info[nome] = {"pos": pos_sigla, "foto": foto_url}

            stats_map = {
                s.get("name"): float(s.get("value") or 0)
                for s in (player.get("stats") or [])
                if s.get("name")
            }
            eh_titular = bool(player.get("starter"))
            entrou_sub = bool(player.get("subbedIn") or stats_map.get("subIns", 0) > 0)
            jogou = eh_titular or entrou_sub or stats_map.get("appearances", 0) > 0
            if jogou and nome not in elenco_vasco:
                elenco_vasco.append(nome)
                if eh_titular:
                    titulares_vasco.append(nome)
                else:
                    reservas_vasco.append(nome)

            assists = int(stats_map.get("goalAssists", 0))
            if assists > 0:
                assist_por_stats[nome] = assists

    assist_final = assist_por_stats if assist_por_stats else assist_por_texto
    assistencias_vasco = [
        {"jogador": nome, "assistencias": qtd}
        for nome, qtd in assist_final.items()
        if qtd > 0
    ]

    return {
        "vasco": gols_vasco,
        "adversario": gols_adv,
        "elenco_vasco": elenco_vasco,
        "titulares_vasco": titulares_vasco,
        "reservas_vasco": reservas_vasco,
        "assistencias_vasco": assistencias_vasco,
        "jogadores_info": jogadores_info,
    }


def enriquecer_gols_partidas(db: Session, partidas: list[Partida], limite: int = 5) -> None:
    """Preenche gols_detalhes, elenco e fotos/posições sob demanda para partidas finalizadas."""
    pendentes = []
    for p in partidas:
        if not p.external_id or (p.status_jogo or "finalizado") != "finalizado":
            continue
        if p.gols_detalhes is None:
            pendentes.append(p)
        else:
            try:
                parsed = json.loads(p.gols_detalhes)
                if "elenco_vasco" not in parsed or "jogadores_info" not in parsed or "titulares_vasco" not in parsed:
                    pendentes.append(p)
            except Exception:
                pendentes.append(p)
        if len(pendentes) >= limite:
            break

    if not pendentes:
        return

    def _fetch(p: Partida):
        try:
            return p.id, buscar_gols_partida_espn(p.external_id)
        except Exception:
            return p.id, None

    with ThreadPoolExecutor(max_workers=10) as pool:
        resultados = list(pool.map(_fetch, pendentes))

    por_id = {p.id: p for p in pendentes}
    alterou = False
    for pid, detalhes in resultados:
        if detalhes is not None:
            por_id[pid].gols_detalhes = json.dumps(detalhes, ensure_ascii=False)
            alterou = True

    if alterou:
        db.commit()


_CACHE_365_ELENCO: Optional[dict[str, dict]] = None


def _norm_nome_jogador(nome: str) -> str:
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFKD", (nome or "").lower().strip()) if not unicodedata.combining(c)
    )
    return re.sub(r"\s+", " ", sem_acento)


def _norm_pos_365(pos_name: str) -> str:
    low = _norm_nome_jogador(pos_name)
    if "goleiro" in low or "goalkeeper" in low:
        return "GOL"
    if "lateral direito" in low or "right back" in low:
        return "LD"
    if "lateral esquerdo" in low or "left back" in low:
        return "LE"
    if "zagueiro" in low or "defensor" in low or "defender" in low or "defesa" in low:
        return "DEF"
    if "volante" in low:
        return "VOL"
    if "meia" in low or "meio" in low or "midfield" in low:
        return "MEI"
    if "atacante" in low or "ponta" in low or "centroavante" in low or "forward" in low:
        return "ATA"
    return "JOG"


def buscar_elenco_365scores() -> dict[str, dict]:
    """Busca fotos e posições do elenco atual do Vasco via 365Scores (com cache em memória)."""
    global _CACHE_365_ELENCO
    if _CACHE_365_ELENCO is not None:
        return _CACHE_365_ELENCO

    url = "https://webws.365scores.com/web/squads/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&competitors=1227"
    req = urllib.request.Request(url, headers={"User-Agent": "VasCheckin/2.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    mapa: dict[str, dict] = {}
    squads = data.get("squads") or []
    athletes = squads[0].get("athletes", []) if squads else []

    for a in athletes:
        aid = a.get("id")
        nome = a.get("name") or ""
        if not aid or not nome:
            continue
        ver = a.get("imageVersion") or 1
        foto = f"https://imagecache.365scores.com/image/upload/f_png,w_120,h_120,c_limit,q_auto:eco,dpr_2/v{ver}/Athletes/{aid}"
        pos_raw = (a.get("position") or {}).get("name") or a.get("positionName") or a.get("formationPositionName") or ""
        pos = _norm_pos_365(pos_raw)
        info = {"foto": foto, "pos": pos}
        chave = _norm_nome_jogador(nome)
        mapa[chave] = info

    # Aliases comuns entre ESPN e 365Scores
    aliases = {
        "jose luis rodriguez": "puma rodriguez",
    }
    for espn_nome, s365_nome in aliases.items():
        if s365_nome in mapa and espn_nome not in mapa:
            mapa[espn_nome] = mapa[s365_nome]

    _CACHE_365_ELENCO = mapa
    return mapa


_CACHE_365_BUSCA: dict[str, Optional[dict]] = {}


def buscar_jogadores_365_em_lote(nomes: list[str]) -> dict[str, dict]:
    """Busca foto e posição na 365Scores para jogadores fora do elenco atual (com cache)."""
    faltantes = []
    resultado: dict[str, dict] = {}
    for nome in nomes:
        chave = _norm_nome_jogador(nome)
        if chave in _CACHE_365_BUSCA:
            if _CACHE_365_BUSCA[chave]:
                resultado[chave] = _CACHE_365_BUSCA[chave]  # type: ignore[assignment]
        else:
            faltantes.append((nome, chave))

    if not faltantes:
        return resultado

    def _buscar_um(item: tuple[str, str]):
        nome, chave = item
        try:
            url = (
                "https://webws.365scores.com/web/search/?appTypeId=5&langId=31&query="
                + urllib.parse.quote(nome)
            )
            req = urllib.request.Request(url, headers={"User-Agent": "VasCheckin/2.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            athletes = data.get("athletes") or []
            if not athletes:
                return chave, None
            a = athletes[0]
            aid = a.get("id")
            if not aid:
                return chave, None
            ver = a.get("imageVersion") or 1
            foto = f"https://imagecache.365scores.com/image/upload/f_png,w_120,h_120,c_limit,q_auto:eco,dpr_2/v{ver}/Athletes/{aid}"
            pos_raw = (a.get("position") or {}).get("name") or a.get("positionName") or ""
            pos = _norm_pos_365(pos_raw)
            return chave, {"foto": foto, "pos": pos}
        except Exception:
            return chave, None

    with ThreadPoolExecutor(max_workers=8) as pool:
        for chave, info in pool.map(_buscar_um, faltantes[:20]):
            _CACHE_365_BUSCA[chave] = info
            if info:
                resultado[chave] = info

    return resultado


HISTORICO_2019_2024_IDS = {
    2019: {"537072"},
    2020: {"561190", "582777"},
    2022: {"632952"},
    2023: {"666012", "666073", "666094"},
    2024: {"699418", "699589", "699530", "699658", "699708", "699718"},
}

ESTADIO_OVERRIDE_HISTORICO = {
    "582777": "Estádio Nilton Santos (Engenhão)",
}


def importar_historico_2019_2024(db: Session, valor_ingresso_padrao: float = 50.0) -> dict:
    """Importa os 13 jogos históricos (2019-2024) validados na ESPN com presença marcada e ingresso R$ 50."""
    criados = 0
    atualizados = 0

    for season, ids_alvo in HISTORICO_2019_2024_IDS.items():
        eventos = _fetch_espn_events(fixture=False, season=season)
        for ev in eventos:
            ev_id = str(ev.get("id") or "")
            if ev_id not in ids_alvo:
                continue

            parsed = _parse_espn_event(ev)
            if not parsed:
                continue

            if ev_id in ESTADIO_OVERRIDE_HISTORICO:
                parsed["estadio"] = ESTADIO_OVERRIDE_HISTORICO[ev_id]

            existente = db.query(Partida).filter(Partida.external_id == ev_id).first()
            if existente:
                existente.estadio = parsed["estadio"]
                existente.competicao = parsed["competicao"]
                existente.adversario_logo = parsed["adversario_logo"]
                existente.fui = True
                if not existente.valor_ingresso:
                    existente.valor_ingresso = valor_ingresso_padrao
                atualizados += 1
            else:
                nova = Partida(
                    **parsed,
                    fui=True,
                    valor_ingresso=valor_ingresso_padrao,
                    valor_extras=0.0,
                )
                db.add(nova)
                criados += 1

    db.commit()
    return {"criados": criados, "atualizados": atualizados}


def _adversario_bate(a: str, b: str) -> bool:
    na = _norm_nome_jogador(a)
    nb = _norm_nome_jogador(b)
    if not na or not nb:
        return False
    if na in nb or nb in na:
        return True
    tokens_a = {t for t in na.split() if len(t) >= 3}
    tokens_b = {t for t in nb.split() if len(t) >= 3}
    return bool(tokens_a & tokens_b)


def vincular_partidas_manuais_espn(db: Session) -> dict:
    """Vincula partidas criadas manualmente (sem external_id) aos eventos da ESPN para enriquecer gols e elenco."""
    sem_id = db.query(Partida).filter(Partida.external_id.is_(None)).all()
    if not sem_id:
        return {"vinculados": 0, "pendentes": 0}

    anos = sorted({p.data_jogo.year for p in sem_id})
    eventos_espn: list[dict] = []
    for yr in anos:
        try:
            evs = _fetch_espn_events(fixture=False, season=yr)
            for ev in evs:
                parsed = _parse_espn_event(ev)
                if parsed:
                    eventos_espn.append(parsed)
        except Exception:
            continue

    by_ext_id = {
        p.external_id: p
        for p in db.query(Partida).filter(Partida.external_id.isnot(None)).all()
    }

    vinculados = 0
    mesclados = 0
    for p in sem_id:
        for ev in eventos_espn:
            if abs((p.data_jogo - ev["data_jogo"]).days) > 1:
                continue
            if p.gols_vasco != ev["gols_vasco"] or p.gols_adversario != ev["gols_adversario"]:
                continue
            if not _adversario_bate(p.adversario, ev["adversario"]):
                continue

            synced_row = by_ext_id.get(ev["external_id"])
            if synced_row and synced_row.id != p.id:
                # Mescla dados do check-in manual no registro sincronizado da ESPN e remove duplicata
                synced_row.fui = bool(synced_row.fui or p.fui)
                if not synced_row.valor_ingresso and p.valor_ingresso:
                    synced_row.valor_ingresso = p.valor_ingresso
                if not synced_row.valor_extras and p.valor_extras:
                    synced_row.valor_extras = p.valor_extras
                if not synced_row.observacoes and p.observacoes:
                    synced_row.observacoes = p.observacoes
                db.delete(p)
                mesclados += 1
            else:
                p.external_id = ev["external_id"]
                p.estadio = ev["estadio"]
                p.competicao = ev["competicao"]
                if not p.adversario_logo and ev["adversario_logo"]:
                    p.adversario_logo = ev["adversario_logo"]
                by_ext_id[ev["external_id"]] = p
                vinculados += 1
            break

    if vinculados > 0 or mesclados > 0:
        db.commit()

    return {
        "vinculados": vinculados,
        "mesclados": mesclados,
        "pendentes": len(sem_id) - vinculados - mesclados,
    }

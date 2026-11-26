import { useEffect, useState } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Lock,
  Unlock,
  MapPin,
  Calendar,
  Wallet,
  Flame,
  X,
  CheckCircle2,
  RefreshCw,
  Ticket,
  Check,
  Edit3,
  Award,
  Swords,
  Quote,
  Share2,
  Users,
  Download,
  Search
} from 'lucide-react';

interface GolDetalhe {
  jogador: string;
  minuto: string;
}

interface Partida {
  id: number;
  external_id?: string | null;
  data_jogo: string;
  competicao: string;
  adversario: string;
  adversario_logo?: string | null;
  mando: 'Casa' | 'Fora' | 'Neutro';
  estadio: string;
  gols_vasco: number;
  gols_adversario: number;
  valor_ingresso: number;
  valor_extras: number;
  observacoes?: string | null;
  fui: boolean;
  status_jogo: 'agendado' | 'ao_vivo' | 'finalizado';
  resultado: 'V' | 'E' | 'D' | '-';
  custo_total: number;
  gols_detalhes?: {
    vasco: GolDetalhe[];
    adversario: GolDetalhe[];
  } | null;
}

interface AdversarioStats {
  adversario: string;
  adversario_logo?: string | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
}

interface JogadorStat {
  jogador: string;
  posicao?: string;
  foto?: string | null;
  jogos?: number;
  gols?: number;
  assistencias?: number;
  total?: number;
  jogos_em_campo?: number;
  media_por_jogo?: number;
}

interface HeatmapItem {
  data_jogo: string;
  resultado: 'V' | 'E' | 'D';
  adversario: string;
  placar: string;
  estadio: string;
}

interface Estatisticas {
  total_jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  aproveitamento_percentual: number;
  gols_pro: number;
  gols_contra: number;
  saldo_gols: number;
  investimento_total: number;
  ticket_medio: number;
  sequencia_invicta_atual: number;
  sequencia_vitorias_atual: number;
  maior_sequencia_invicta: number;
  maior_sequencia_vitorias: number;
  maior_vitoria?: {
    adversario: string;
    placar: string;
    gols_vasco: number;
    data_jogo: string;
  } | null;
  estadio_mais_visitado?: {
    nome: string;
    jogos: number;
  } | null;
  ultimo_resultado?: {
    resultado: 'V' | 'E' | 'D';
    placar: string;
    adversario: string;
  } | null;
  clean_sheets?: number;
  clean_sheets_pct?: number;
  jogos_sem_marcar?: number;
  jogos_sem_marcar_pct?: number;
  media_gols_pro?: number;
  media_gols_contra?: number;
  gols_apos_80?: number;
  custo_por_ponto?: number;
  custo_por_gol?: number;
  maior_fregues?: {
    adversario: string;
    adversario_logo?: string | null;
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    aproveitamento: number;
  } | null;
  opcoes_competicoes?: string[];
  opcoes_estadios?: string[];
  por_estadio: Record<string, { jogos: number; vitorias: number; empates: number; derrotas: number }>;
  por_competicao: Record<string, { jogos: number; vitorias: number; empates: number; derrotas: number }>;
  por_mando?: Record<string, { jogos: number; vitorias: number; empates: number; derrotas: number }>;
  ranking_adversarios: AdversarioStats[];
  jogadores_mais_vistos?: JogadorStat[];
  artilheiros_vasco?: JogadorStat[];
  assistencias_vasco?: JogadorStat[];
  participacoes_gols?: JogadorStat[];
  heatmap_presenca?: HeatmapItem[];
  total_sincronizados?: number;
  total_pendentes?: number;
}

type AbaAtiva = 'estatisticas' | 'checkins' | 'fazer-checkin';
type FiltroCheckin = 'pendentes' | 'todos' | 'fui';

const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000');

const VASCO_LOGO_URL = 'https://a.espncdn.com/i/teamlogos/soccer/500/3454.png';

async function fetchComRetry(input: string, init?: RequestInit, tentativas = 2): Promise<Response> {
  let ultimoErro: unknown;
  for (let i = 0; i <= tentativas; i++) {
    try {
      const res = await fetch(input, init);
      if (res.status >= 500 && i < tentativas) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      ultimoErro = err;
      if (i < tentativas) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw ultimoErro;
}

function CruzDeMalta({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/cruz-de-malta.png"
      alt="Cruz de Malta - Vasco da Gama"
      className={`${className} object-contain`}
    />
  );
}

function BolaIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <polygon points="12,7 15.8,9.8 14.3,14.2 9.7,14.2 8.2,9.8" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 2.5V7M21 9.5l-5.2.3M17.5 19.5l-3.2-5.3M6.5 19.5l3.2-5.3M3 9.5l5.2.3" />
    </svg>
  );
}

function EstadioIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="10" rx="10" ry="4.5" />
      <path d="M2 10v5c0 2.5 4.5 4.5 10 4.5s10-2 10-4.5v-5" />
      <path d="M7 10.2c1.4-.6 3.1-.9 5-.9s3.6.3 5 .9" />
      <path d="M12 5.5v-2M6 6.2v-1.5M18 6.2v-1.5" />
      <path d="M9 19.2v-3.7h6v3.7" />
    </svg>
  );
}

function JogadorAvatar({ nome, foto }: { nome: string; foto?: string | null }) {
  const [erro, setErro] = useState(false);
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/80 shrink-0 flex items-center justify-center">
      {foto && !erro ? (
        <img
          src={foto}
          alt={nome}
          onError={() => setErro(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <span className="text-[10px] font-bold text-zinc-300">{iniciais}</span>
      )}
    </div>
  );
}

export default function App() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Autenticação Admin
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('vasco_admin_key') || '');
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');

  // Abas e Filtros
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('estatisticas');
  const [filtroAno, setFiltroAno] = useState<string>('');
  const [filtroCompeticao, setFiltroCompeticao] = useState<string>('');
  const [filtroEstadio, setFiltroEstadio] = useState<string>('');
  const [filtroCheckin, setFiltroCheckin] = useState<FiltroCheckin>('pendentes');
  const [abaAdversario, setAbaAdversario] = useState<'enfrentados' | 'fregueses' | 'algozes'>('fregueses');
  const [buscaAdversario, setBuscaAdversario] = useState('');
  const [jogosModal, setJogosModal] = useState<{
    titulo: string;
    subtitulo?: string;
    logo?: string | null;
    destacarMinuto80?: boolean;
    jogos: Partida[];
  } | null>(null);

  // Sincronização e Compartilhamento
  const [sincronizando, setSincronizando] = useState(false);
  const [modalShareAberto, setModalShareAberto] = useState(false);

  // Modal Check-in
  const [partidaCheckin, setPartidaCheckin] = useState<Partida | null>(null);
  const [checkinForm, setCheckinForm] = useState({
    valor_ingresso: 0,
    valor_extras: 0,
    observacoes: ''
  });
  const [salvandoCheckin, setSalvandoCheckin] = useState(false);

  // Modal Nova Partida (manual / histórico antigo)
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    data_jogo: new Date().toISOString().split('T')[0],
    competicao: 'Brasileirão',
    adversario: '',
    mando: 'Casa' as 'Casa' | 'Fora' | 'Neutro',
    estadio: 'São Januário',
    gols_vasco: 1,
    gols_adversario: 0,
    valor_ingresso: 0,
    valor_extras: 0,
    observacoes: ''
  });

  async function carregarDados() {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      if (filtroAno) params.append('ano', filtroAno);
      if (filtroCompeticao) params.append('competicao', filtroCompeticao);
      if (filtroEstadio) params.append('estadio', filtroEstadio);

      if (!adminKey || abaAtiva !== 'fazer-checkin') {
        params.append('fui', 'true');
      } else {
        if (filtroCheckin === 'fui') params.append('fui', 'true');
        if (filtroCheckin === 'pendentes') params.append('fui', 'false');
      }

      const statsParams = new URLSearchParams();
      if (filtroAno) statsParams.append('ano', filtroAno);
      if (filtroCompeticao) statsParams.append('competicao', filtroCompeticao);
      if (filtroEstadio) statsParams.append('estadio', filtroEstadio);

      const [resPartidas, resStats] = await Promise.all([
        fetchComRetry(`${API_URL}/partidas?${params.toString()}`),
        fetchComRetry(`${API_URL}/estatisticas?${statsParams.toString()}`)
      ]);

      if (!resPartidas.ok || !resStats.ok) {
        throw new Error('Falha ao conectar com a API.');
      }

      const dataPartidas = await resPartidas.json();
      const dataStats = await resStats.json();

      setPartidas(dataPartidas);
      setStats(dataStats);
    } catch {
      setErro('Não foi possível carregar os dados. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [filtroAno, filtroCompeticao, filtroEstadio, abaAtiva, filtroCheckin, adminKey]);

  function salvarChaveAdmin(e: React.FormEvent) {
    e.preventDefault();
    const chave = senhaInput.trim();
    localStorage.setItem('vasco_admin_key', chave);
    setAdminKey(chave);
    setSenhaInput('');
    setModalLoginAberto(false);
  }

  function sairAdmin() {
    localStorage.removeItem('vasco_admin_key');
    setAdminKey('');
    if (abaAtiva === 'fazer-checkin') {
      setAbaAtiva('estatisticas');
    }
  }

  async function handleBaixarBackup() {
    try {
      const res = await fetchComRetry(`${API_URL}/backup/json`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      if (res.status === 401) {
        alert('Chave de administrador inválida!');
        sairAdmin();
        return;
      }
      if (!res.ok) {
        alert('Erro ao gerar backup.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vascheckin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Não foi possível baixar o backup agora.');
    }
  }

  async function handleSincronizar() {
    setSincronizando(true);
    setAviso('');
    setErro('');
    try {
      const res = await fetchComRetry(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey }
      });

      if (res.status === 401) {
        alert('Chave de administrador inválida! Faça login novamente.');
        sairAdmin();
        return;
      }

      if (!res.ok) {
        throw new Error('Erro ao sincronizar jogos.');
      }

      const data = await res.json();
      setAviso(
        `Jogos sincronizados: ${data.criados} novo(s), ${data.atualizados} atualizado(s).`
      );
      await carregarDados();
    } catch {
      setErro('Não foi possível sincronizar os jogos agora. Tente novamente em instantes.');
    } finally {
      setSincronizando(false);
    }
  }

  function abrirModalCheckin(p: Partida) {
    setPartidaCheckin(p);
    setCheckinForm({
      valor_ingresso: p.valor_ingresso || 0,
      valor_extras: p.valor_extras || 0,
      observacoes: p.observacoes || ''
    });
  }

  async function salvarCheckin(fui: boolean) {
    if (!partidaCheckin) return;
    setSalvandoCheckin(true);
    try {
      const res = await fetchComRetry(`${API_URL}/partidas/${partidaCheckin.id}/checkin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          fui,
          valor_ingresso: fui ? Number(checkinForm.valor_ingresso) || 0 : 0,
          valor_extras: fui ? Number(checkinForm.valor_extras) || 0 : 0,
          observacoes: fui ? checkinForm.observacoes.trim() || null : null
        })
      });

      if (res.status === 401) {
        alert('Chave de administrador inválida! Faça login novamente.');
        sairAdmin();
        setPartidaCheckin(null);
        return;
      }

      if (!res.ok) {
        alert('Erro ao salvar check-in.');
        return;
      }

      setPartidaCheckin(null);
      await carregarDados();
    } finally {
      setSalvandoCheckin(false);
    }
  }

  async function handleCriarPartida(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetchComRetry(`${API_URL}/partidas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          ...form,
          fui: true,
          status_jogo: 'finalizado',
          gols_vasco: Number(form.gols_vasco),
          gols_adversario: Number(form.gols_adversario),
          valor_ingresso: Number(form.valor_ingresso),
          valor_extras: Number(form.valor_extras)
        })
      });

      if (res.status === 401) {
        alert('Chave de administrador inválida! Faça login novamente.');
        sairAdmin();
        return;
      }

      if (!res.ok) {
        alert('Erro ao salvar partida. Confira os campos preenchidos.');
        return;
      }

      setModalNovoAberto(false);
      setForm({
        ...form,
        adversario: '',
        gols_vasco: 1,
        gols_adversario: 0,
        valor_ingresso: 0,
        valor_extras: 0,
        observacoes: ''
      });
      await carregarDados();
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletar(id: number, adversario: string) {
    if (!confirm(`Remover o jogo contra ${adversario}?`)) return;
    const res = await fetchComRetry(`${API_URL}/partidas/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': adminKey }
    });
    if (res.status === 401) {
      alert('Chave inválida!');
      sairAdmin();
      return;
    }
    if (res.ok) {
      await carregarDados();
    }
  }

  const badgeStatus = (p: Partida) => {
    if (p.status_jogo === 'agendado') {
      return {
        label: 'AGENDADO',
        cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
      };
    }
    if (p.status_jogo === 'ao_vivo') {
      return {
        label: 'AO VIVO',
        cls: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
      };
    }
    if (p.resultado === 'V') {
      return { label: 'VITÓRIA', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (p.resultado === 'E') {
      return { label: 'EMPATE', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    return { label: 'DERROTA', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
  };

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarData = (iso: string) => {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const pluralJogos = (n: number) => `${n} ${n === 1 ? 'jogo' : 'jogos'}`;

  const jogosFinalizados = partidas.filter((p) => p.status_jogo === 'finalizado');

  const abrirModalAdversario = (adv: AdversarioStats) => {
    const aprovAdv =
      adv.jogos > 0 ? Math.round(((adv.vitorias * 3 + adv.empates) / (adv.jogos * 3)) * 100) : 0;
    setJogosModal({
      titulo: `Vasco × ${adv.adversario}`,
      subtitulo: `${pluralJogos(adv.jogos)} • ${adv.vitorias}V • ${adv.empates}E • ${adv.derrotas}D • ${aprovAdv}%`,
      logo: adv.adversario_logo,
      jogos: jogosFinalizados.filter((p) => p.adversario.toLowerCase() === adv.adversario.toLowerCase())
    });
  };

  const abrirModalSequencia = (tipo: 'invicta' | 'vitorias') => {
    const cronologicos = [...jogosFinalizados].reverse();
    let melhor: Partida[] = [];
    let atual: Partida[] = [];
    for (const p of cronologicos) {
      const ok = tipo === 'invicta' ? p.gols_vasco >= p.gols_adversario : p.gols_vasco > p.gols_adversario;
      if (ok) {
        atual.push(p);
        if (atual.length >= melhor.length) melhor = [...atual];
      } else {
        atual = [];
      }
    }
    setJogosModal({
      titulo: tipo === 'invicta' ? 'Maior Sequência Invicta' : 'Maior Sequência de Vitórias',
      subtitulo: `${pluralJogos(melhor.length)} consecutivos`,
      jogos: [...melhor].reverse()
    });
  };

  const parseMinutoSort = (minStr: string): number => {
    const m = /^(\d+)(?:\+(\d+))?/.exec((minStr || '').replace(/'/g, '').trim());
    if (!m) return 999;
    return Number(m[1]) + (m[2] ? Number(m[2]) * 0.01 : 0);
  };

  const ehMinuto80Mais = (minStr: string): boolean => {
    const m = /^(\d+)/.exec((minStr || '').trim());
    return m ? Number(m[1]) >= 80 : false;
  };

  const jogosApos80 = jogosFinalizados.filter((p) =>
    (p.gols_detalhes?.vasco || []).some((g) => ehMinuto80Mais(g.minuto))
  );

  const vitoriasDeVirada = jogosFinalizados.filter((p) => {
    if (p.gols_vasco <= p.gols_adversario || !p.gols_detalhes) return false;
    const eventos: { lado: 'V' | 'A'; ordem: number }[] = [
      ...(p.gols_detalhes.vasco || []).map((g) => ({ lado: 'V' as const, ordem: parseMinutoSort(g.minuto) })),
      ...(p.gols_detalhes.adversario || []).map((g) => ({ lado: 'A' as const, ordem: parseMinutoSort(g.minuto) }))
    ].sort((a, b) => a.ordem - b.ordem);

    let pv = 0;
    let pa = 0;
    for (const ev of eventos) {
      if (ev.lado === 'V') pv++;
      else pa++;
      if (pa > pv) return true;
    }
    return false;
  });

  const agruparGolsPorJogador = (gols: GolDetalhe[]) => {
    const mapa = new Map<string, string[]>();
    for (const g of gols) {
      const lista = mapa.get(g.jogador) || [];
      if (g.minuto) lista.push(g.minuto);
      mapa.set(g.jogador, lista);
    }
    return Array.from(mapa.entries()).map(([jogador, minutos]) => ({ jogador, minutos }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 pb-16">
      {/* Faixa diagonal decorativa no topo */}
      <div className="h-1.5 w-full bg-gradient-to-r from-zinc-900 via-white to-[#D4AF37]" />

      {/* Header com Glassmorphism e faixa diagonal sutil */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-10 w-[420px] h-28 bg-white opacity-[0.03] -rotate-12"
        />
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
              <CruzDeMalta className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                VasCheckin
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  1898
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug mt-0.5">
                Diário de Arquibancada: Check-in Pessoal &amp; Análise de Dados • Por{' '}
                <a
                  href="https://github.com/gustavoocdp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-[#D4AF37] transition-colors font-medium"
                >
                  @gustavocdp
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {abaAtiva === 'estatisticas' && stats && stats.total_jogos > 0 && (
              <button
                onClick={() => setModalShareAberto(true)}
                title="Gerar card para Stories"
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#D4AF37]/40 text-zinc-200 text-xs sm:text-sm px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden md:inline">Compartilhar</span>
              </button>
            )}
            {adminKey ? (
              <>
                <button
                  onClick={handleBaixarBackup}
                  title="Baixar backup completo em JSON"
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs sm:text-sm px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden md:inline">Backup</span>
                </button>
                <button
                  onClick={handleSincronizar}
                  disabled={sincronizando}
                  title="Buscar jogos atualizados do Vasco"
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-xs sm:text-sm px-3 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${sincronizando ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
                <button
                  onClick={() => setModalNovoAberto(true)}
                  title="Adicionar partida manualmente"
                  className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#c5a028] text-black font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Manual</span>
                </button>
                <button
                  onClick={sairAdmin}
                  title="Sair do modo Admin"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 transition cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setModalLoginAberto(true)}
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs sm:text-sm px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Modo Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Navegação principal (Estatísticas e Check-ins públicos + Fazer Check-in apenas Admin) */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2 relative">
          <button
            onClick={() => setAbaAtiva('estatisticas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              abaAtiva === 'estatisticas'
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Estatísticas
          </button>
          <button
            onClick={() => setAbaAtiva('checkins')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              abaAtiva === 'checkins'
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span>Check-ins</span>
            {stats && (
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold tabular-nums ${
                  abaAtiva === 'checkins' ? 'bg-black/15 text-black' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {stats.total_jogos}
              </span>
            )}
          </button>
          {adminKey && (
            <button
              onClick={() => setAbaAtiva('fazer-checkin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                abaAtiva === 'fazer-checkin'
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Fazer Check-in</span>
              {stats?.total_pendentes !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold tabular-nums ${
                    abaAtiva === 'fazer-checkin' ? 'bg-black/20 text-black' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
                  }`}
                >
                  {stats.total_pendentes}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {erro && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-sm">
            {erro}
          </div>
        )}

        {aviso && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-200 text-sm flex items-center justify-between">
            <span>{aviso}</span>
            <button onClick={() => setAviso('')} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filtro compacto na aba Estatísticas */}
        {abaAtiva === 'estatisticas' && (() => {
          const temFiltro = Boolean(filtroAno || filtroCompeticao || filtroEstadio);
          const partesRecorte = [
            filtroAno,
            filtroCompeticao,
            filtroEstadio
          ].filter(Boolean);

          return (
            <div className="space-y-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-bold text-white">Minhas Estatísticas</h2>
                  {stats && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 tabular-nums">
                      Exibindo {pluralJogos(stats.total_jogos)}
                      {partesRecorte.length > 0 ? ` • ${partesRecorte.join(' • ')}` : ''}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filtroAno}
                    onChange={(e) => setFiltroAno(e.target.value)}
                    className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Todos os anos</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                  </select>

                  <select
                    value={filtroCompeticao}
                    onChange={(e) => setFiltroCompeticao(e.target.value)}
                    className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Todas competições</option>
                    {(stats?.opcoes_competicoes || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEstadio}
                    onChange={(e) => setFiltroEstadio(e.target.value)}
                    className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37] max-w-[200px]"
                  >
                    <option value="">Todos estádios</option>
                    {(stats?.opcoes_estadios || []).map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>

                  {temFiltro && (
                    <button
                      onClick={() => {
                        setFiltroAno('');
                        setFiltroCompeticao('');
                        setFiltroEstadio('');
                      }}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-[#D4AF37] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Limpar filtros</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Últimos Check-ins (Carrossel horizontal de 4 por vez no topo da aba Estatísticas) */}
        {abaAtiva === 'estatisticas' && partidas.length > 0 && (
          <section className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#D4AF37]" />
                Últimos Check-ins
              </h2>
              <button
                onClick={() => setAbaAtiva('checkins')}
                className="text-xs font-semibold text-zinc-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
              >
                Ver todos →
              </button>
            </div>

            <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-[calc((100%-12px)/2)] lg:auto-cols-[calc((100%-36px)/4)] gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {partidas.map((p) => {
                const badge = badgeStatus(p);
                const borderLeftCls =
                  p.status_jogo === 'agendado'
                    ? 'border-l-zinc-500'
                    : p.resultado === 'V'
                    ? 'border-l-emerald-500'
                    : p.resultado === 'E'
                    ? 'border-l-[#D4AF37]'
                    : 'border-l-rose-500';

                return (
                  <button
                    key={`ultimo-${p.id}`}
                    type="button"
                    onClick={() => setAbaAtiva('checkins')}
                    className={`snap-start text-left bg-zinc-900/80 border border-zinc-800 border-l-4 ${borderLeftCls} rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 flex flex-col justify-between gap-2.5 cursor-pointer`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 w-full">
                      <span className="truncate font-medium text-zinc-300">{p.competicao}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded border text-[10px] shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-zinc-950/60 border border-zinc-800/70 rounded-lg px-3 py-2 w-full">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {p.mando === 'Fora' ? (
                          p.adversario_logo && (
                            <img src={p.adversario_logo} alt={p.adversario} className="w-5 h-5 object-contain shrink-0" />
                          )
                        ) : (
                          <img src={VASCO_LOGO_URL} alt="Vasco" className="w-5 h-5 object-contain shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-white truncate">
                          {p.mando === 'Fora' ? p.adversario : 'Vasco'}
                        </span>
                      </div>

                      <div className="text-sm font-extrabold tabular-nums shrink-0 px-1">
                        <span className={p.mando === 'Fora' ? 'text-zinc-400' : 'text-white'}>
                          {p.mando === 'Fora' ? p.gols_adversario : p.gols_vasco}
                        </span>
                        <span className="text-zinc-600 mx-1">×</span>
                        <span className={p.mando === 'Fora' ? 'text-white' : 'text-zinc-400'}>
                          {p.mando === 'Fora' ? p.gols_vasco : p.gols_adversario}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-semibold text-zinc-300 truncate">
                          {p.mando === 'Fora' ? 'Vasco' : p.adversario}
                        </span>
                        {p.mando === 'Fora' ? (
                          <img src={VASCO_LOGO_URL} alt="Vasco" className="w-5 h-5 object-contain shrink-0" />
                        ) : (
                          p.adversario_logo && (
                            <img src={p.adversario_logo} alt={p.adversario} className="w-5 h-5 object-contain shrink-0" />
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 w-full">
                      <span className="truncate pr-2">{p.estadio}</span>
                      <span className="tabular-nums shrink-0">{formatarData(p.data_jogo)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* KPIs Principais (Grid assimétrico, watermarks e barra segmentada) */}
        {abaAtiva === 'estatisticas' && stats && (() => {
          const totalFinalizados = stats.vitorias + stats.empates + stats.derrotas;
          const pctV = totalFinalizados > 0 ? (stats.vitorias / totalFinalizados) * 100 : 0;
          const pctE = totalFinalizados > 0 ? (stats.empates / totalFinalizados) * 100 : 0;
          const pctD = totalFinalizados > 0 ? (stats.derrotas / totalFinalizados) * 100 : 0;
          return (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
              <div className="lg:col-span-3 relative overflow-hidden bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                <EstadioIcon className="w-20 h-20 text-white opacity-[0.05] absolute -right-2 -bottom-2 pointer-events-none" />
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2 relative">
                  <span>HISTÓRICO IN LOCO</span>
                  <Ticket className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="text-3xl font-extrabold text-white tabular-nums flex items-baseline gap-1.5">
                  <span>{stats.total_jogos}</span>
                  <span className="text-sm font-semibold text-zinc-400">
                    {stats.total_jogos === 1 ? 'jogo' : 'jogos'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs tabular-nums">
                  <span className="text-emerald-400 font-semibold">{stats.vitorias}V</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400 font-semibold">{stats.empates}E</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-rose-400 font-semibold">{stats.derrotas}D</span>
                </div>
              </div>

              <div className="lg:col-span-4 relative overflow-hidden bg-[#141414] border border-[#D4AF37]/25 rounded-2xl p-4 sm:p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-6 w-40 h-48 bg-white opacity-[0.03] rotate-12"
                />
                <img
                  src="/cruz-de-malta.png"
                  alt=""
                  aria-hidden="true"
                  className="w-20 h-20 object-contain opacity-[0.06] absolute right-2 bottom-1 pointer-events-none select-none"
                />
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2 relative">
                  <span>APROVEITAMENTO</span>
                  <Trophy className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#D4AF37] tabular-nums relative">
                  {stats.aproveitamento_percentual}%
                </div>
                {/* Barra segmentada V/E/D */}
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex relative">
                  {pctV > 0 && <div style={{ width: `${pctV}%` }} className="bg-emerald-500 h-full" />}
                  {pctE > 0 && <div style={{ width: `${pctE}%` }} className="bg-amber-400 h-full" />}
                  {pctD > 0 && <div style={{ width: `${pctD}%` }} className="bg-rose-500 h-full" />}
                </div>
                {stats.sequencia_invicta_atual > 0 ? (
                  <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1 relative">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Invicto há {pluralJogos(stats.sequencia_invicta_atual)}</span>
                  </div>
                ) : stats.ultimo_resultado ? (
                  <div className="mt-2 text-xs text-zinc-400 relative tabular-nums">
                    Último:{' '}
                    <span className="text-zinc-200 font-medium">
                      {stats.ultimo_resultado.resultado === 'V'
                        ? 'Vitória'
                        : stats.ultimo_resultado.resultado === 'E'
                        ? 'Empate'
                        : 'Derrota'}{' '}
                      ({stats.ultimo_resultado.placar})
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="lg:col-span-2 relative overflow-hidden bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 opacity-[0.04] absolute -right-2 -bottom-2 pointer-events-none" />
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
                  <span>SALDO</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white tabular-nums">
                  {stats.saldo_gols > 0 ? `+${stats.saldo_gols}` : stats.saldo_gols}
                </div>
                <div className="mt-2 text-xs text-zinc-400 tabular-nums">
                  {stats.gols_pro} pró • {stats.gols_contra} contra
                </div>
              </div>

              <div className="lg:col-span-3 relative overflow-hidden bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                <Wallet className="w-16 h-16 text-white opacity-[0.04] absolute -right-2 -bottom-2 pointer-events-none" />
                <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2 gap-2">
                  <span>VALOR GASTO COM INGRESSOS</span>
                  <Wallet className="w-4 h-4 text-zinc-300 shrink-0" />
                </div>
                <div className="text-2xl font-extrabold text-white truncate tabular-nums">
                  {formatarMoeda(stats.investimento_total)}
                </div>
                <div className="mt-2 text-xs text-zinc-400 tabular-nums">
                  {stats.investimento_total > 0
                    ? `Média de ${formatarMoeda(stats.ticket_medio)}/jogo`
                    : 'Nenhum gasto registrado'}
                </div>
              </div>
            </section>
          );
        })()}

        {/* Linha de Micro-KPIs Secundários */}
        {abaAtiva === 'estatisticas' && stats && stats.total_jogos > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-[#141414] border border-zinc-800/80 rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Média de Gols / Jogo
              </div>
              <div className="text-sm font-bold text-white mt-1 tabular-nums">
                {stats.media_gols_pro ?? 0} pró •{' '}
                <span className="text-zinc-400">{stats.media_gols_contra ?? 0} contra</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-zinc-800/80 rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Clean Sheets / Em Branco
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                {stats.clean_sheets ?? 0} sem sofrer ({stats.clean_sheets_pct ?? 0}%)
              </div>
              <div className="text-[11px] text-zinc-500 tabular-nums">
                {stats.jogos_sem_marcar ?? 0} sem marcar ({stats.jogos_sem_marcar_pct ?? 0}%)
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setJogosModal({
                  titulo: "Gols no Finalzinho (80'+)",
                  subtitulo: `${pluralJogos(jogosApos80.length)} com gol do Vasco após os 35' do 2ºT`,
                  destacarMinuto80: true,
                  jogos: jogosApos80
                })
              }
              className="text-left bg-[#141414] border border-zinc-800/80 hover:border-amber-500/40 rounded-xl px-4 py-3 transition cursor-pointer"
            >
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Gols no Finalzinho (80&apos;+)
              </div>
              <div className="text-sm font-bold text-[#D4AF37] mt-1 tabular-nums">
                {stats.gols_apos_80 ?? 0} {(stats.gols_apos_80 ?? 0) === 1 ? 'gol' : 'gols'} após 35&apos; 2ºT
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setJogosModal({
                  titulo: 'Vitórias de Virada',
                  subtitulo: `${pluralJogos(vitoriasDeVirada.length)} em que o Vasco saiu atrás e virou`,
                  jogos: vitoriasDeVirada
                })
              }
              className="text-left bg-[#141414] border border-zinc-800/80 hover:border-amber-500/40 rounded-xl px-4 py-3 transition cursor-pointer"
            >
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Vitórias de Virada
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                {pluralJogos(vitoriasDeVirada.length)}
              </div>
            </button>

            <div className="col-span-2 md:col-span-1 bg-[#141414] border border-zinc-800/80 rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Eficiência Financeira
              </div>
              {stats.investimento_total > 0 ? (
                <>
                  <div className="text-sm font-bold text-white mt-1 tabular-nums">
                    {formatarMoeda(stats.custo_por_ponto ?? 0)}/ponto
                  </div>
                  <div className="text-[11px] text-zinc-400 tabular-nums">
                    {formatarMoeda(stats.custo_por_gol ?? 0)} por gol visto
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500 mt-1">Sem gastos no recorte</div>
              )}
            </div>
          </section>
        )}

        {/* Desempenho por Estádio */}
        {abaAtiva === 'estatisticas' && stats && Object.keys(stats.por_estadio).length > 0 && (
          <section className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              Retrospecto por Estádio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(stats.por_estadio).map(([estadio, dados]) => {
                const aprov = Math.round(((dados.vitorias * 3 + dados.empates) / (dados.jogos * 3)) * 100);
                return (
                  <button
                    key={estadio}
                    type="button"
                    onClick={() =>
                      setJogosModal({
                        titulo: estadio,
                        subtitulo: `${pluralJogos(dados.jogos)} • ${dados.vitorias}V • ${dados.empates}E • ${dados.derrotas}D • ${aprov}%`,
                        jogos: jogosFinalizados.filter((p) => p.estadio === estadio)
                      })
                    }
                    className="text-left p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-sm text-white truncate">{estadio}</div>
                      <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                        {pluralJogos(dados.jogos)} • {dados.vitorias}V • {dados.empates}E • {dados.derrotas}D
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg tabular-nums shrink-0">
                      {aprov}%
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Recordes Pessoais */}
        {abaAtiva === 'estatisticas' && stats && stats.total_jogos > 0 && (
          <section className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              Recordes Pessoais
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => abrirModalSequencia('invicta')}
                className="text-left p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 transition cursor-pointer"
              >
                <div className="text-[11px] text-zinc-400 uppercase font-medium">Maior Sequência Invicta</div>
                <div className="text-xl font-extrabold text-white mt-1 tabular-nums">
                  {pluralJogos(stats.maior_sequencia_invicta)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                  Atual: {pluralJogos(stats.sequencia_invicta_atual)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => abrirModalSequencia('vitorias')}
                className="text-left p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 transition cursor-pointer"
              >
                <div className="text-[11px] text-zinc-400 uppercase font-medium">Maior Sequência de Vitórias</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-1 tabular-nums">
                  {pluralJogos(stats.maior_sequencia_vitorias)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                  Atual: {pluralJogos(stats.sequencia_vitorias_atual)}
                </div>
              </button>

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-medium">Maior Vitória</div>
                {stats.maior_vitoria ? (
                  <>
                    <div className="text-xl font-extrabold text-[#D4AF37] mt-1">
                      {stats.maior_vitoria.placar}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      vs {stats.maior_vitoria.adversario}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-zinc-500 mt-1.5">Sem vitórias ainda</div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-medium">Casa Mais Frequentada</div>
                {stats.estadio_mais_visitado ? (
                  <>
                    <div className="text-sm font-bold text-white mt-1.5 truncate">
                      {stats.estadio_mais_visitado.nome}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                      {pluralJogos(stats.estadio_mais_visitado.jogos)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-zinc-500 mt-1.5">-</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Retrospecto por Competição + Mando de Campo | Ranking de Adversários */}
        {abaAtiva === 'estatisticas' && stats && (Object.keys(stats.por_competicao || {}).length > 0 || (stats.ranking_adversarios || []).length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              {Object.keys(stats.por_competicao || {}).length > 0 && (
                <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#D4AF37]" />
                    Retrospecto por Competição
                  </h2>
                  <div className="space-y-2.5">
                    {Object.entries(stats.por_competicao).map(([comp, dados]) => {
                      const aprov = Math.round(((dados.vitorias * 3 + dados.empates) / (dados.jogos * 3)) * 100);
                      return (
                        <button
                          key={comp}
                          type="button"
                          onClick={() =>
                            setJogosModal({
                              titulo: comp,
                              subtitulo: `${pluralJogos(dados.jogos)} • ${dados.vitorias}V • ${dados.empates}E • ${dados.derrotas}D • ${aprov}%`,
                              jogos: jogosFinalizados.filter((p) => p.competicao === comp)
                            })
                          }
                          className="w-full text-left p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-sm text-white">{comp}</div>
                            <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                              {pluralJogos(dados.jogos)} • {dados.vitorias}V • {dados.empates}E • {dados.derrotas}D
                            </div>
                          </div>
                          <span className="text-sm font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg tabular-nums shrink-0">
                            <span className="text-[11px] font-medium text-[#D4AF37]/80 mr-1.5">Aproveitamento</span>
                            {aprov}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.por_mando && Object.keys(stats.por_mando).length > 0 && (
                <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                    Mando de Campo
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(['Casa', 'Fora', 'Neutro'] as const)
                      .filter((m) => stats.por_mando?.[m])
                      .map((mando) => {
                        const dados = stats.por_mando![mando];
                        const aprov = Math.round(
                          ((dados.vitorias * 3 + dados.empates) / (dados.jogos * 3)) * 100
                        );
                        return (
                          <div
                            key={mando}
                            className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-white">{mando}</span>
                              <span className="text-xs font-bold text-[#D4AF37] tabular-nums">{aprov}%</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 tabular-nums">
                              {dados.jogos}j • {dados.vitorias}V • {dados.empates}E • {dados.derrotas}D
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {(stats.ranking_adversarios || []).length > 0 && (() => {
              const calcAprov = (a: AdversarioStats) =>
                a.jogos > 0 ? Math.round(((a.vitorias * 3 + a.empates) / (a.jogos * 3)) * 100) : 0;

              const ehClassicoCarioca = (nome: string) => {
                const n = nome.toLowerCase();
                return n.includes('flamengo') || n.includes('fluminense') || n.includes('botafogo');
              };

              const classicos = stats.ranking_adversarios.filter((a) => ehClassicoCarioca(a.adversario));
              const classicosResumo = classicos.reduce(
                (acc, a) => ({
                  jogos: acc.jogos + a.jogos,
                  v: acc.v + a.vitorias,
                  e: acc.e + a.empates,
                  d: acc.d + a.derrotas
                }),
                { jogos: 0, v: 0, e: 0, d: 0 }
              );
              const aprovClassicos =
                classicosResumo.jogos > 0
                  ? Math.round(((classicosResumo.v * 3 + classicosResumo.e) / (classicosResumo.jogos * 3)) * 100)
                  : 0;

              const normalizarTexto = (s: string) =>
                s
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '');

              const termoBusca = normalizarTexto(buscaAdversario.trim());
              const listaBase = termoBusca
                ? stats.ranking_adversarios.filter((a) => normalizarTexto(a.adversario).includes(termoBusca))
                : [...stats.ranking_adversarios];
              const limite = termoBusca ? 50 : 15;
              let listaExibida: AdversarioStats[] = [];

              if (abaAdversario === 'enfrentados') {
                listaExibida = listaBase.slice(0, limite);
              } else if (abaAdversario === 'fregueses') {
                const elegiveis = termoBusca ? listaBase : listaBase.filter((a) => a.jogos >= 2);
                const pool = elegiveis.length > 0 ? elegiveis : listaBase;
                listaExibida = pool
                  .filter((a) => termoBusca || a.vitorias > 0)
                  .sort(
                    (a, b) =>
                      b.vitorias - b.derrotas - (a.vitorias - a.derrotas) ||
                      b.vitorias - a.vitorias ||
                      calcAprov(b) - calcAprov(a) ||
                      b.gols_pro - b.gols_contra - (a.gols_pro - a.gols_contra)
                  )
                  .slice(0, limite);
              } else {
                listaExibida = listaBase
                  .filter((a) => termoBusca || a.derrotas > 0)
                  .sort(
                    (a, b) =>
                      b.derrotas - a.derrotas ||
                      calcAprov(a) - calcAprov(b) ||
                      a.gols_pro - a.gols_contra - (b.gols_pro - b.gols_contra)
                  )
                  .slice(0, limite);
              }

              const maxJogos = Math.max(...stats.ranking_adversarios.map((a) => a.jogos), 1);

              const renderLinhaAdv = (adv: AdversarioStats, idx: number, mostrarPodio: boolean) => {
                const aprov = calcAprov(adv);
                const pctBar = Math.round((adv.jogos / maxJogos) * 100);
                const pctV = adv.jogos > 0 ? (adv.vitorias / adv.jogos) * 100 : 0;
                const pctE = adv.jogos > 0 ? (adv.empates / adv.jogos) * 100 : 0;
                const pctD = adv.jogos > 0 ? (adv.derrotas / adv.jogos) * 100 : 0;

                const cardCls = mostrarPodio
                  ? idx === 0
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]'
                    : idx === 1
                    ? 'border-zinc-500/40'
                    : idx === 2
                    ? 'border-amber-700/40'
                    : 'border-white/10'
                  : 'border-white/10';

                const rankBadge = mostrarPodio
                  ? idx === 0
                    ? 'bg-[#D4AF37] text-black'
                    : idx === 1
                    ? 'bg-zinc-300 text-black'
                    : idx === 2
                    ? 'bg-amber-700 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                  : 'bg-zinc-800 text-zinc-400';

                const corAprovTexto =
                  aprov > 50
                    ? 'text-emerald-400'
                    : aprov === 50
                    ? 'text-amber-300/90'
                    : 'text-rose-400/80';

                return (
                  <div
                    key={adv.adversario}
                    className={`relative overflow-hidden p-3 rounded-xl bg-zinc-900/80 border flex items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 ${cardCls}`}
                  >
                    <div
                      aria-hidden="true"
                      style={{ width: `${pctBar}%` }}
                      className="absolute inset-y-0 left-0 bg-white/[0.03] pointer-events-none"
                    />
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 relative">
                      <span
                        className={`text-[11px] font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0 tabular-nums ${rankBadge}`}
                      >
                        {idx + 1}
                      </span>
                      {adv.adversario_logo && (
                        <img
                          src={adv.adversario_logo}
                          alt={adv.adversario}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1 max-w-[230px]">
                        <div className="font-semibold text-sm text-white truncate">{adv.adversario}</div>
                        <div className="text-xs text-zinc-400 tabular-nums">
                          {adv.vitorias}V • {adv.empates}E • {adv.derrotas}D • Gols: {adv.gols_pro}x{adv.gols_contra}
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                          {pctV > 0 && <div style={{ width: `${pctV}%` }} className="bg-emerald-500 h-full" />}
                          {pctE > 0 && <div style={{ width: `${pctE}%` }} className="bg-amber-400 h-full" />}
                          {pctD > 0 && <div style={{ width: `${pctD}%` }} className="bg-rose-500/80 h-full" />}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirModalAdversario(adv)}
                      title={`Ver jogos contra ${adv.adversario}`}
                      className="text-xs font-bold bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/70 hover:border-[#D4AF37]/50 text-zinc-200 px-2.5 py-1 rounded-lg shrink-0 tabular-nums relative transition cursor-pointer"
                    >
                      {pluralJogos(adv.jogos)} • <span className={corAprovTexto}>{aprov}%</span>
                    </button>
                  </div>
                );
              };

              const classicosLista = listaExibida.filter((a) => ehClassicoCarioca(a.adversario));
              const outrosLista = listaExibida.filter((a) => !ehClassicoCarioca(a.adversario));

              return (
                <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-[#D4AF37]" />
                      Retrospecto por Adversário
                    </h2>
                    {stats.maior_fregues && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tabular-nums">
                        Maior Freguês: {stats.maior_fregues.adversario} ({stats.maior_fregues.vitorias}V •{' '}
                        {stats.maior_fregues.aproveitamento}%)
                      </span>
                    )}
                  </div>

                  {/* Seletor segmentado de ordenação + Busca por time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 w-fit">
                      <button
                        type="button"
                        onClick={() => setAbaAdversario('fregueses')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          abaAdversario === 'fregueses'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Maiores Fregueses
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaAdversario('enfrentados')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          abaAdversario === 'enfrentados'
                            ? 'bg-[#D4AF37] text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Mais Enfrentados
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaAdversario('algozes')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          abaAdversario === 'algozes'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Algozes
                      </button>
                    </div>

                    <div className="relative flex-1 min-w-[140px] max-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar time..."
                        value={buscaAdversario}
                        onChange={(e) => setBuscaAdversario(e.target.value)}
                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                      {buscaAdversario && (
                        <button
                          type="button"
                          onClick={() => setBuscaAdversario('')}
                          aria-label="Limpar busca"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {abaAdversario === 'enfrentados' ? (
                      <>
                        {classicosLista.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-0.5">
                              <span className="font-semibold uppercase tracking-wider text-zinc-500">
                                Clássicos Cariocas
                              </span>
                              <span className="tabular-nums font-medium text-zinc-300">
                                {pluralJogos(classicosResumo.jogos)} • {classicosResumo.v}V {classicosResumo.e}E{' '}
                                {classicosResumo.d}D •{' '}
                                <span className="text-[#D4AF37] font-bold">{aprovClassicos}%</span>
                              </span>
                            </div>
                            {classicosLista.map((adv, idx) => renderLinhaAdv(adv, idx, false))}
                          </div>
                        )}

                        {outrosLista.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {classicosLista.length > 0 && (
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-1 pt-1">
                                Interestaduais / Outros
                              </div>
                            )}
                            {outrosLista.map((adv, idx) => renderLinhaAdv(adv, idx, false))}
                          </div>
                        )}
                      </>
                    ) : listaExibida.length > 0 ? (
                      listaExibida.map((adv, idx) =>
                        renderLinhaAdv(adv, idx, abaAdversario === 'fregueses')
                      )
                    ) : (
                      <p className="text-xs text-zinc-500 py-4 text-center">
                        Nenhum adversário encontrado neste critério.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* Elenco em Campo (Grid 2x2, Top 5 com Ver todos, barra sutil e média/jogo) */}
        {abaAtiva === 'estatisticas' &&
          stats &&
          ((stats.jogadores_mais_vistos || []).length > 0 ||
            (stats.artilheiros_vasco || []).length > 0 ||
            (stats.assistencias_vasco || []).length > 0 ||
            (stats.participacoes_gols || []).length > 0) && (() => {
            const configs = [
              {
                key: 'vistos',
                titulo: 'Jogadores Mais Vistos',
                icone: <Users className="w-4 h-4 text-[#D4AF37]" />,
                lista: stats.jogadores_mais_vistos || [],
                valorFn: (i: JogadorStat) => i.jogos || 0,
                badgeFn: (i: JogadorStat) => `${i.jogos || 0}j`,
                subFn: () => '',
                destaqueCls: 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]',
                corNum: 'text-[#D4AF37]',
                corBadge: 'text-zinc-200 bg-zinc-800',
                vazio: 'Nenhum jogador registrado.'
              },
              {
                key: 'artilheiros',
                titulo: 'Artilheiros',
                icone: <BolaIcon className="w-4 h-4 text-[#D4AF37]" />,
                lista: stats.artilheiros_vasco || [],
                valorFn: (i: JogadorStat) => i.gols || 0,
                badgeFn: (i: JogadorStat) => `${i.gols || 0} ${(i.gols || 0) === 1 ? 'gol' : 'gols'}`,
                subFn: (i: JogadorStat) =>
                  i.media_por_jogo ? `${i.media_por_jogo.toFixed(2)}/jogo` : '',
                destaqueCls: 'border-emerald-500/40 bg-emerald-500/[0.04]',
                corNum: 'text-emerald-400',
                corBadge: 'text-emerald-400 bg-emerald-500/10',
                vazio: 'Nenhum gol do Vasco registrado nos jogos presentes.'
              },
              {
                key: 'assistentes',
                titulo: 'Assistentes',
                icone: <Award className="w-4 h-4 text-[#D4AF37]" />,
                lista: stats.assistencias_vasco || [],
                valorFn: (i: JogadorStat) => i.assistencias || 0,
                badgeFn: (i: JogadorStat) =>
                  `${i.assistencias || 0} ${(i.assistencias || 0) === 1 ? 'ast' : 'asts'}`,
                subFn: (i: JogadorStat) =>
                  i.media_por_jogo ? `${i.media_por_jogo.toFixed(2)}/jogo` : '',
                destaqueCls: 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]',
                corNum: 'text-[#D4AF37]',
                corBadge: 'text-[#D4AF37] bg-[#D4AF37]/10',
                vazio: 'Nenhuma assistência informada pela fonte nos jogos presentes.'
              },
              {
                key: 'ga',
                titulo: 'Maior G+A',
                icone: <Flame className="w-4 h-4 text-[#D4AF37]" />,
                lista: stats.participacoes_gols || [],
                valorFn: (i: JogadorStat) => i.total || 0,
                badgeFn: (i: JogadorStat) => `${i.total || 0} G+A`,
                subFn: (i: JogadorStat) =>
                  `${i.gols || 0}G+${i.assistencias || 0}A${
                    i.media_por_jogo ? ` • ${i.media_por_jogo.toFixed(2)}/j` : ''
                  }`,
                destaqueCls: 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]',
                corNum: 'text-[#D4AF37]',
                corBadge: 'text-white bg-zinc-800',
                vazio: 'Nenhuma participação em gols registrada.'
              }
            ];

            return (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {configs.map((cfg) => {
                  const visiveis = cfg.lista.slice(0, 15);
                  const maxVal = Math.max(...cfg.lista.map(cfg.valorFn), 1);

                  return (
                    <div
                      key={cfg.key}
                      className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                            {cfg.icone}
                            {cfg.titulo}
                          </h2>
                        </div>

                        {visiveis.length > 0 ? (
                          <div className="space-y-2 max-h-[268px] overflow-y-auto pr-1">
                            {visiveis.map((item, idx) => {
                              const pct = Math.round((cfg.valorFn(item) / maxVal) * 100);
                              const sub = cfg.subFn(item);
                              return (
                                <div
                                  key={item.jogador}
                                  className={`relative overflow-hidden px-3 py-2 rounded-xl bg-zinc-900/80 border flex items-center justify-between gap-2 text-xs ${
                                    idx === 0 ? cfg.destaqueCls : 'border-zinc-800'
                                  }`}
                                >
                                  <div
                                    aria-hidden="true"
                                    style={{ width: `${pct}%` }}
                                    className="absolute inset-y-0 left-0 bg-white/[0.03] pointer-events-none"
                                  />
                                  <div className="flex items-center gap-2 min-w-0 relative">
                                    <span
                                      className={`font-bold w-4 text-center shrink-0 tabular-nums ${
                                        idx === 0 ? cfg.corNum : 'text-zinc-500'
                                      }`}
                                    >
                                      {idx + 1}
                                    </span>
                                    <JogadorAvatar nome={item.jogador} foto={item.foto} />
                                    <div className="min-w-0">
                                      <div className="text-white font-medium truncate">{item.jogador}</div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {item.posicao && (
                                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/70">
                                            {item.posicao}
                                          </span>
                                        )}
                                        {sub && (
                                          <span className="text-[10px] text-zinc-400 tabular-nums truncate">
                                            {sub}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded-md tabular-nums shrink-0 relative ${cfg.corBadge}`}
                                  >
                                    {cfg.badgeFn(item)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">{cfg.vazio}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })()}

        {/* Retrospecto Mensal (Heatmap Anual) */}
        {abaAtiva === 'estatisticas' && stats && (stats.heatmap_presenca || []).length > 0 && (() => {
          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const porMes: Record<number, HeatmapItem[]> = {};
          for (const item of stats.heatmap_presenca || []) {
            const mesIdx = Number(item.data_jogo.split('-')[1]) - 1;
            if (!porMes[mesIdx]) porMes[mesIdx] = [];
            porMes[mesIdx].push(item);
          }

          return (
            <section className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  Retrospecto Mensal {filtroAno ? `(${filtroAno})` : ''}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 border border-zinc-700 inline-block" /> 0 jogos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Vitória
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Empate
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Derrota
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {meses.map((nomeMes, idx) => {
                  const jogosMes = porMes[idx] || [];
                  return (
                    <div
                      key={nomeMes}
                      className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2 flex flex-col items-center gap-2 min-h-[68px]"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {nomeMes}
                      </span>
                      <div className="flex flex-wrap justify-center gap-1">
                        {jogosMes.length === 0 ? (
                          <span
                            title={`${nomeMes}: 0 jogos`}
                            className="w-3 h-3 rounded-sm bg-zinc-800/50 border border-zinc-800"
                          />
                        ) : (
                          jogosMes.map((j, jIdx) => {
                            const cor =
                              j.resultado === 'V'
                                ? 'bg-emerald-500 border-emerald-400/60'
                                : j.resultado === 'E'
                                ? 'bg-amber-400 border-amber-300/60'
                                : 'bg-rose-500 border-rose-400/60';
                            return (
                              <button
                                key={`${j.data_jogo}-${jIdx}`}
                                type="button"
                                onClick={() =>
                                  setJogosModal({
                                    titulo: `Jogos em ${nomeMes}${filtroAno ? `/${filtroAno}` : ''}`,
                                    subtitulo: pluralJogos(jogosMes.length),
                                    jogos: jogosFinalizados.filter(
                                      (p) => Number(p.data_jogo.split('-')[1]) - 1 === idx
                                    )
                                  })
                                }
                                title={`${formatarData(j.data_jogo)} • Vasco ${j.placar} ${j.adversario} (${j.estadio})`}
                                className={`w-3.5 h-3.5 rounded-sm border transition-transform hover:scale-125 cursor-pointer ${cor}`}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Barra de Filtros + Lista de Jogos (Check-ins públicos ou Fazer Check-in Admin) */}
        {(abaAtiva === 'checkins' || (adminKey && abaAtiva === 'fazer-checkin')) && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {adminKey && abaAtiva === 'fazer-checkin' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFiltroCheckin('pendentes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    filtroCheckin === 'pendentes'
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-[#141414] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  Pendentes {stats?.total_pendentes !== undefined ? `(${stats.total_pendentes})` : ''}
                </button>
                <button
                  onClick={() => setFiltroCheckin('fui')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    filtroCheckin === 'fui'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#141414] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  Já fiz check-in {stats ? `(${stats.total_jogos})` : ''}
                </button>
                <button
                  onClick={() => setFiltroCheckin('todos')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    filtroCheckin === 'todos'
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-[#141414] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  Todos {stats?.total_sincronizados ? `(${stats.total_sincronizados})` : ''}
                </button>
              </div>
            ) : (
              <h2 className="text-base font-bold text-white">Histórico de Partidas</h2>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">Todos os anos</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              <input
                type="text"
                placeholder="Filtrar estádio..."
                value={filtroEstadio}
                onChange={(e) => setFiltroEstadio(e.target.value)}
                className="bg-[#141414] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Carregando partidas...</div>
          ) : partidas.length === 0 ? (
            <div className="text-center py-12 bg-[#141414] border border-zinc-800 rounded-2xl text-zinc-400 text-sm">
              Nenhuma partida encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {partidas.map((p) => {
                const badge = badgeStatus(p);
                const borderLeftCls =
                  p.status_jogo === 'agendado'
                    ? 'border-l-zinc-500'
                    : p.resultado === 'V'
                    ? 'border-l-emerald-500'
                    : p.resultado === 'E'
                    ? 'border-l-[#D4AF37]'
                    : 'border-l-rose-500';

                const golsMandante =
                  p.mando === 'Fora' ? p.gols_detalhes?.adversario || [] : p.gols_detalhes?.vasco || [];
                const golsVisitante =
                  p.mando === 'Fora' ? p.gols_detalhes?.vasco || [] : p.gols_detalhes?.adversario || [];
                const temGolsDetalhes = golsMandante.length > 0 || golsVisitante.length > 0;

                return (
                  <article
                    key={p.id}
                    className={`bg-[#141414] border border-zinc-800/90 border-l-4 ${borderLeftCls} rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 flex flex-col justify-between gap-3`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-300">{p.competicao}</span>
                          {p.fui && abaAtiva === 'fazer-checkin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <Check className="w-3 h-3" />
                              FUI
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatarData(p.data_jogo)}
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Placar */}
                      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-4 py-3 my-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2 min-w-0 flex-1">
                            {p.mando === 'Fora' ? (
                              p.adversario_logo && (
                                <img src={p.adversario_logo} alt={p.adversario} className="w-6 h-6 object-contain shrink-0" />
                              )
                            ) : (
                              <img src={VASCO_LOGO_URL} alt="Vasco da Gama" className="w-6 h-6 object-contain shrink-0" />
                            )}
                            <span className="truncate">{p.mando === 'Fora' ? p.adversario : 'Vasco da Gama'}</span>
                          </div>

                          {p.status_jogo === 'agendado' ? (
                            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-3 shrink-0">
                              VS
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 text-2xl font-bold tracking-wider shrink-0 tabular-nums px-2">
                              <span className={p.mando === 'Fora' ? 'text-zinc-400' : 'text-white'}>
                                {p.mando === 'Fora' ? p.gols_adversario : p.gols_vasco}
                              </span>
                              <span className="text-zinc-600 text-sm font-normal">×</span>
                              <span className={p.mando === 'Fora' ? 'text-white' : 'text-zinc-400'}>
                                {p.mando === 'Fora' ? p.gols_vasco : p.gols_adversario}
                              </span>
                            </div>
                          )}

                          <div className="font-bold text-sm sm:text-base text-zinc-300 text-right flex items-center justify-end gap-2 min-w-0 flex-1">
                            <span className="truncate">{p.mando === 'Fora' ? 'Vasco da Gama' : p.adversario}</span>
                            {p.mando === 'Fora' ? (
                              <img src={VASCO_LOGO_URL} alt="Vasco da Gama" className="w-6 h-6 object-contain shrink-0" />
                            ) : (
                              p.adversario_logo && (
                                <img src={p.adversario_logo} alt={p.adversario} className="w-6 h-6 object-contain shrink-0" />
                              )
                            )}
                          </div>
                        </div>

                        {/* Autores dos gols (estilo placar) */}
                        {temGolsDetalhes && (
                          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-[11px] text-zinc-400">
                            <div className="space-y-0.5 text-left min-w-0">
                              {golsMandante.map((g, i) => (
                                <div key={i} className="truncate">
                                  <span className="text-zinc-300">{g.jogador}</span>{' '}
                                  {g.minuto && <span className="text-zinc-500 tabular-nums">{g.minuto}</span>}
                                </div>
                              ))}
                            </div>
                            <div className="pt-0.5 text-zinc-500">
                              <BolaIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="space-y-0.5 text-right min-w-0">
                              {golsVisitante.map((g, i) => (
                                <div key={i} className="truncate">
                                  <span className="text-zinc-300">{g.jogador}</span>{' '}
                                  {g.minuto && <span className="text-zinc-500 tabular-nums">{g.minuto}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {p.observacoes && (
                        <div className="mt-2.5 flex items-start gap-2 bg-zinc-900/60 border border-zinc-800/70 rounded-xl px-3 py-2 text-xs text-zinc-300 italic">
                          <Quote className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                          <span>{p.observacoes}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-dashed border-zinc-800 flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                        <span className="flex items-center gap-1 text-zinc-300 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="truncate">{p.estadio}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.fui && (
                          <span className="font-semibold text-zinc-200 tabular-nums">
                            {formatarMoeda(p.custo_total)}
                          </span>
                        )}

                        {adminKey && (
                          <>
                            <button
                              onClick={() => abrirModalCheckin(p)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                                p.fui
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                  : 'bg-[#D4AF37] hover:bg-[#c5a028] text-black'
                              }`}
                            >
                              {p.fui ? (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  <span>Editar</span>
                                </>
                              ) : (
                                <>
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>Check-in</span>
                                </>
                              )}
                            </button>

                            {!p.external_id && (
                              <button
                                onClick={() => handleDeletar(p.id, p.adversario)}
                                title="Excluir partida manual"
                                className="text-zinc-500 hover:text-rose-400 transition cursor-pointer p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}
      </main>

      {/* Modal Login Admin */}
      {modalLoginAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={salvarChaveAdmin}
            className="bg-[#161616] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                Acesso Administrador
              </h3>
              <button
                type="button"
                onClick={() => setModalLoginAberto(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Digite sua chave secreta (<code>ADMIN_KEY</code>) para liberar o check-in e a sincronização de jogos.
            </p>
            <input
              type="password"
              required
              placeholder="Sua chave secreta..."
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#c5a028] text-black font-bold py-2.5 rounded-xl text-sm transition cursor-pointer"
            >
              Desbloquear Painel
            </button>
          </form>
        </div>
      )}

      {/* Modal Check-in Rápido */}
      {partidaCheckin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] border border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#D4AF37]" />
                Check-in na Arquibancada
              </h3>
              <button
                type="button"
                onClick={() => setPartidaCheckin(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo já preenchido do jogo */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{partidaCheckin.competicao}</span>
                <span>{formatarData(partidaCheckin.data_jogo)}</span>
              </div>
              <div className="font-bold text-white text-sm">
                {partidaCheckin.mando === 'Fora'
                  ? `${partidaCheckin.adversario} ${
                      partidaCheckin.status_jogo === 'agendado'
                        ? 'x'
                        : `${partidaCheckin.gols_adversario} x ${partidaCheckin.gols_vasco}`
                    } Vasco`
                  : `Vasco ${
                      partidaCheckin.status_jogo === 'agendado'
                        ? 'x'
                        : `${partidaCheckin.gols_vasco} x ${partidaCheckin.gols_adversario}`
                    } ${partidaCheckin.adversario}`}
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{partidaCheckin.estadio}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                salvarCheckin(true);
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Ingresso (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={checkinForm.valor_ingresso}
                    onChange={(e) =>
                      setCheckinForm({ ...checkinForm, valor_ingresso: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Extras (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={checkinForm.valor_extras}
                    onChange={(e) =>
                      setCheckinForm({ ...checkinForm, valor_extras: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Comentário / Memórias (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Gol no apagar das luzes, chuva na Colina..."
                  value={checkinForm.observacoes}
                  onChange={(e) => setCheckinForm({ ...checkinForm, observacoes: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={salvandoCheckin}
                  className="w-full bg-[#D4AF37] hover:bg-[#c5a028] disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition cursor-pointer"
                >
                  {salvandoCheckin ? 'Salvando...' : 'Confirmar Check-in'}
                </button>

                {partidaCheckin.fui && (
                  <button
                    type="button"
                    disabled={salvandoCheckin}
                    onClick={() => salvarCheckin(false)}
                    className="w-full bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-800/60 text-zinc-300 hover:text-rose-200 font-medium py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Desmarcar Presença (Não fui)
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Partida (Manual) */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCriarPartida}
            className="bg-[#161616] border border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CruzDeMalta className="w-5 h-5" />
                Adicionar Partida Manualmente
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Data do Jogo</label>
                <input
                  type="date"
                  required
                  value={form.data_jogo}
                  onChange={(e) => setForm({ ...form, data_jogo: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Competição</label>
                <select
                  value={form.competicao}
                  onChange={(e) => setForm({ ...form, competicao: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option>Brasileirão</option>
                  <option>Copa do Brasil</option>
                  <option>Carioca</option>
                  <option>Sul-Americana</option>
                  <option>Libertadores</option>
                  <option>Amistoso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Adversário</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Flamengo, Botafogo..."
                  value={form.adversario}
                  onChange={(e) => setForm({ ...form, adversario: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Mando</label>
                <select
                  value={form.mando}
                  onChange={(e) =>
                    setForm({ ...form, mando: e.target.value as 'Casa' | 'Fora' | 'Neutro' })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="Casa">Casa</option>
                  <option value="Fora">Fora</option>
                  <option value="Neutro">Neutro</option>
                </select>
              </div>
            </div>

            {/* Placar */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Gols do Vasco</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.gols_vasco}
                  onChange={(e) => setForm({ ...form, gols_vasco: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-base font-bold text-white text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Gols do Adversário</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.gols_adversario}
                  onChange={(e) => setForm({ ...form, gols_adversario: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-base font-bold text-white text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Estádio</label>
              <input
                type="text"
                required
                value={form.estadio}
                onChange={(e) => setForm({ ...form, estadio: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ingresso (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.valor_ingresso}
                  onChange={(e) => setForm({ ...form, valor_ingresso: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Extras (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.valor_extras}
                  onChange={(e) => setForm({ ...form, valor_extras: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Comentário / Memórias</label>
              <input
                type="text"
                placeholder="Ex: Gol no apagar das luzes, chuva na Colina..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-[#D4AF37] hover:bg-[#c5a028] disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition cursor-pointer"
            >
              {salvando ? 'Salvando...' : 'Salvar Partida'}
            </button>
          </form>
        </div>
      )}

      {/* Modal Compartilhar Card (Stories 9:16) */}
      {modalShareAberto && stats && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xs w-full space-y-3 my-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Resumo de Arquibancada (Stories 9:16)</span>
              <button
                type="button"
                onClick={() => setModalShareAberto(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-b from-[#121212] via-[#0B0B0B] to-[#15120A] border border-[#D4AF37]/40 rounded-3xl p-6 aspect-[9/16] flex flex-col justify-between shadow-2xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 top-16 w-[380px] h-24 bg-white opacity-[0.04] -rotate-45"
              />
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-2.5">
                  <CruzDeMalta className="w-8 h-8" />
                  <div>
                    <div className="text-base font-extrabold text-white leading-tight">VasCheckin</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#D4AF37]">
                      {filtroAno ? `Temporada ${filtroAno}` : 'Histórico Geral'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  1898
                </span>
              </div>

              <div className="space-y-4 relative">
                <div className="text-center py-4 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl">
                  <div className="text-[11px] uppercase tracking-widest text-zinc-400">Aproveitamento</div>
                  <div className="text-5xl font-black text-[#D4AF37] tabular-nums mt-1">
                    {stats.aproveitamento_percentual}%
                  </div>
                  <div className="text-xs text-zinc-300 mt-2 tabular-nums">
                    {stats.vitorias}V • {stats.empates}E • {stats.derrotas}D
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3 text-center">
                    <div className="text-[10px] uppercase text-zinc-400">Jogos Presente</div>
                    <div className="text-2xl font-extrabold text-white tabular-nums mt-0.5">
                      {stats.total_jogos}
                    </div>
                  </div>
                  <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3 text-center">
                    <div className="text-[10px] uppercase text-zinc-400">Maior Invencibilidade</div>
                    <div className="text-2xl font-extrabold text-emerald-400 tabular-nums mt-0.5">
                      {stats.maior_sequencia_invicta}
                    </div>
                  </div>
                </div>

                {stats.estadio_mais_visitado && (
                  <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Casa Principal
                    </span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {stats.estadio_mais_visitado.nome}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-zinc-500 relative">
                VasCheckin • @gustavocdp
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Lista de Jogos */}
      {jogosModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setJogosModal(null)}
        >
          <div
            className="bg-[#141414] border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {jogosModal.logo && (
                  <img
                    src={jogosModal.logo}
                    alt={jogosModal.titulo}
                    className="w-8 h-8 object-contain shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-base truncate">{jogosModal.titulo}</h3>
                  {jogosModal.subtitulo && (
                    <p className="text-xs text-zinc-400 tabular-nums">{jogosModal.subtitulo}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJogosModal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
              {jogosModal.jogos.length > 0 ? (
                jogosModal.jogos.map((p) => {
                  const badge = badgeStatus(p);
                  const borderLeftCls =
                    p.resultado === 'V'
                      ? 'border-l-emerald-500'
                      : p.resultado === 'E'
                      ? 'border-l-[#D4AF37]'
                      : 'border-l-rose-500';
                  const golsMandante = agruparGolsPorJogador(
                    p.mando === 'Fora' ? p.gols_detalhes?.adversario || [] : p.gols_detalhes?.vasco || []
                  );
                  const golsVisitante = agruparGolsPorJogador(
                    p.mando === 'Fora' ? p.gols_detalhes?.vasco || [] : p.gols_detalhes?.adversario || []
                  );
                  const temGols = golsMandante.length > 0 || golsVisitante.length > 0;

                  return (
                    <div
                      key={`modal-jogo-${p.id}`}
                      className={`bg-zinc-900/80 border border-zinc-800/90 border-l-4 ${borderLeftCls} rounded-2xl p-3.5 space-y-2.5`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-medium text-zinc-300">{p.competicao}</span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{formatarData(p.data_jogo)}</span>
                          <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-2 text-sm font-bold">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {p.mando === 'Fora' ? (
                              p.adversario_logo && (
                                <img
                                  src={p.adversario_logo}
                                  alt={p.adversario}
                                  className="w-5 h-5 object-contain shrink-0"
                                />
                              )
                            ) : (
                              <img src={VASCO_LOGO_URL} alt="Vasco" className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="text-white truncate">
                              {p.mando === 'Fora' ? p.adversario : 'Vasco da Gama'}
                            </span>
                          </div>

                          <div className="text-xl font-black tabular-nums px-2 shrink-0">
                            <span className={p.mando === 'Fora' ? 'text-[#D4AF37]/80' : 'text-white'}>
                              {p.mando === 'Fora' ? p.gols_adversario : p.gols_vasco}
                            </span>
                            <span className="text-zinc-600 text-sm font-normal mx-1.5">×</span>
                            <span className={p.mando === 'Fora' ? 'text-white' : 'text-[#D4AF37]/80'}>
                              {p.mando === 'Fora' ? p.gols_vasco : p.gols_adversario}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                            <span className="text-zinc-200 truncate text-right">
                              {p.mando === 'Fora' ? 'Vasco da Gama' : p.adversario}
                            </span>
                            {p.mando === 'Fora' ? (
                              <img src={VASCO_LOGO_URL} alt="Vasco" className="w-5 h-5 object-contain shrink-0" />
                            ) : (
                              p.adversario_logo && (
                                <img
                                  src={p.adversario_logo}
                                  alt={p.adversario}
                                  className="w-5 h-5 object-contain shrink-0"
                                />
                              )
                            )}
                          </div>
                        </div>

                        {temGols && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-3 text-[11px]">
                            <div className="space-y-1 text-left min-w-0">
                              {golsMandante.map((g, i) => {
                                const ehVasco = p.mando !== 'Fora';
                                const tem80 =
                                  jogosModal.destacarMinuto80 &&
                                  ehVasco &&
                                  g.minutos.some((m) => ehMinuto80Mais(m));
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center gap-1.5 truncate ${
                                      tem80 ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400'
                                    }`}
                                  >
                                    <BolaIcon className="w-3 h-3 shrink-0 opacity-75" />
                                    <span className="truncate">
                                      {g.jogador}
                                      {g.minutos.length > 0 ? ` (${g.minutos.join(', ')})` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="space-y-1 text-right min-w-0">
                              {golsVisitante.map((g, i) => {
                                const ehVasco = p.mando === 'Fora';
                                const tem80 =
                                  jogosModal.destacarMinuto80 &&
                                  ehVasco &&
                                  g.minutos.some((m) => ehMinuto80Mais(m));
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-end gap-1.5 truncate ${
                                      tem80 ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400'
                                    }`}
                                  >
                                    <BolaIcon className="w-3 h-3 shrink-0 opacity-75" />
                                    <span className="truncate">
                                      {g.jogador}
                                      {g.minutos.length > 0 ? ` (${g.minutos.join(', ')})` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="truncate">{p.estadio}</span>
                        </span>
                        <span className="flex items-center gap-1.5 tabular-nums font-medium text-zinc-300 shrink-0">
                          <Ticket className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {formatarMoeda(p.custo_total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">
                  Nenhum jogo encontrado para este recorte.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

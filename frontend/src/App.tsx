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
  Users,
  X,
  CheckCircle2,
  Shield
} from 'lucide-react';

interface Partida {
  id: number;
  data_jogo: string;
  competicao: string;
  adversario: string;
  mando: 'Casa' | 'Fora' | 'Neutro';
  estadio: string;
  setor?: string;
  gols_vasco: number;
  gols_adversario: number;
  valor_ingresso: number;
  valor_extras: number;
  companhia?: string;
  observacoes?: string;
  resultado: 'V' | 'E' | 'D';
  custo_total: number;
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
  por_estadio: Record<string, { jogos: number; vitorias: number; empates: number; derrotas: number }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function CruzDeMalta({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/cruz-de-malta.png"
      alt="Cruz de Malta - Vasco da Gama"
      className={`${className} object-contain`}
    />
  );
}

export default function App() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros
  const [filtroAno, setFiltroAno] = useState<string>('');
  const [filtroEstadio, setFiltroEstadio] = useState<string>('');

  // Autenticação Admin
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('vasco_admin_key') || '');
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');

  // Modal Nova Partida
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    data_jogo: new Date().toISOString().split('T')[0],
    competicao: 'Brasileirão',
    adversario: '',
    mando: 'Casa' as 'Casa' | 'Fora' | 'Neutro',
    estadio: 'São Januário',
    setor: 'Social',
    gols_vasco: 1,
    gols_adversario: 0,
    valor_ingresso: 0,
    valor_extras: 0,
    companhia: 'Sozinho',
    observacoes: ''
  });

  async function carregarDados() {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      if (filtroAno) params.append('ano', filtroAno);
      if (filtroEstadio) params.append('estadio', filtroEstadio);

      const statsParams = new URLSearchParams();
      if (filtroAno) statsParams.append('ano', filtroAno);

      const [resPartidas, resStats] = await Promise.all([
        fetch(`${API_URL}/partidas?${params.toString()}`),
        fetch(`${API_URL}/estatisticas?${statsParams.toString()}`)
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
  }, [filtroAno, filtroEstadio]);

  function salvarChaveAdmin(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('vasco_admin_key', senhaInput.trim());
    setAdminKey(senhaInput.trim());
    setSenhaInput('');
    setModalLoginAberto(false);
  }

  function sairAdmin() {
    localStorage.removeItem('vasco_admin_key');
    setAdminKey('');
  }

  async function handleCriarPartida(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/partidas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          ...form,
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
    const res = await fetch(`${API_URL}/partidas/${id}`, {
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

  const badgeResultado = (res: 'V' | 'E' | 'D') => {
    if (res === 'V') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (res === 'E') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  };

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarData = (iso: string) => {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 pb-16">
      {/* Faixa diagonal decorativa no topo */}
      <div className="h-1.5 w-full bg-gradient-to-r from-zinc-900 via-white to-[#D4AF37]" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-[#111111]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
              <CruzDeMalta className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Vasco Match Tracker
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  1898
                </span>
              </h1>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Diário de Arquibancada • Presença, Aproveitamento & Finanças
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminKey ? (
              <>
                <button
                  onClick={() => setModalNovoAberto(true)}
                  className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#c5a028] text-black font-semibold text-sm px-3.5 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Jogo</span>
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
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {erro && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-sm">
            {erro}
          </div>
        )}

        {/* KPIs Principais */}
        {stats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
                <span>JOGOS PRESENTE</span>
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total_jogos}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">{stats.vitorias}V</span>
                <span className="text-zinc-600">•</span>
                <span className="text-amber-400 font-semibold">{stats.empates}E</span>
                <span className="text-zinc-600">•</span>
                <span className="text-rose-400 font-semibold">{stats.derrotas}D</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
                <span>APROVEITAMENTO</span>
                <Trophy className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#D4AF37]">
                {stats.aproveitamento_percentual}%
              </div>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Invicto há {stats.sequencia_invicta_atual} jogo(s)</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
                <span>SALDO DE GOLS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {stats.saldo_gols > 0 ? `+${stats.saldo_gols}` : stats.saldo_gols}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                {stats.gols_pro} pró • {stats.gols_contra} contra
              </div>
            </div>

            <div className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
                <span>INVESTIMENTO</span>
                <Wallet className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white truncate">
                {formatarMoeda(stats.investimento_total)}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Média de {formatarMoeda(stats.ticket_medio)}/jogo
              </div>
            </div>
          </section>
        )}

        {/* Desempenho por Estádio */}
        {stats && Object.keys(stats.por_estadio).length > 0 && (
          <section className="bg-[#141414] border border-zinc-800/90 rounded-2xl p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              Retrospecto por Estádio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(stats.por_estadio).map(([estadio, dados]) => {
                const aprov = Math.round(((dados.vitorias * 3 + dados.empates) / (dados.jogos * 3)) * 100);
                return (
                  <div
                    key={estadio}
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">{estadio}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {dados.jogos} jogo(s) • {dados.vitorias}V {dados.empates}E {dados.derrotas}D
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg">
                      {aprov}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Barra de Filtros + Lista de Jogos */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">Histórico de Partidas</h2>

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
              {partidas.map((p) => (
                <article
                  key={p.id}
                  className="bg-[#141414] hover:border-zinc-700 border border-zinc-800/90 rounded-2xl p-4 transition flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-2">
                      <span className="font-medium text-zinc-300">{p.competicao}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatarData(p.data_jogo)}
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded border text-[11px] ${badgeResultado(
                            p.resultado
                          )}`}
                        >
                          {p.resultado === 'V' ? 'VITÓRIA' : p.resultado === 'E' ? 'EMPATE' : 'DERROTA'}
                        </span>
                      </div>
                    </div>

                    {/* Placar */}
                    <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-4 py-3 my-2">
                      <div className="font-bold text-sm sm:text-base text-white">
                        {p.mando === 'Fora' ? p.adversario : 'Vasco da Gama'}
                      </div>
                      <div className="flex items-center gap-2.5 text-lg sm:text-xl font-black tracking-wider">
                        <span className="text-white">
                          {p.mando === 'Fora' ? p.gols_adversario : p.gols_vasco}
                        </span>
                        <span className="text-zinc-600 text-sm">x</span>
                        <span className="text-white">
                          {p.mando === 'Fora' ? p.gols_vasco : p.gols_adversario}
                        </span>
                      </div>
                      <div className="font-bold text-sm sm:text-base text-zinc-300 text-right">
                        {p.mando === 'Fora' ? 'Vasco da Gama' : p.adversario}
                      </div>
                    </div>

                    {p.observacoes && (
                      <p className="text-xs text-zinc-400 italic mt-2">"{p.observacoes}"</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {p.estadio} {p.setor ? `(${p.setor})` : ''}
                      </span>
                      {p.companhia && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {p.companhia}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-300">{formatarMoeda(p.custo_total)}</span>
                      {adminKey && (
                        <button
                          onClick={() => handleDeletar(p.id, p.adversario)}
                          title="Excluir partida"
                          className="text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Digite sua chave secreta (<code>ADMIN_KEY</code>) para liberar o cadastro e exclusão de jogos.
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

      {/* Modal Nova Partida */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCriarPartida}
            className="bg-[#161616] border border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CruzDeMalta className="w-5 h-5" />
                Registrar Presença no Jogo
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-zinc-400 hover:text-white"
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

            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Setor</label>
                <input
                  type="text"
                  placeholder="Arquibancada, Social..."
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Companhia</label>
                <input
                  type="text"
                  placeholder="Sozinho, Mari..."
                  value={form.companhia}
                  onChange={(e) => setForm({ ...form, companhia: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Memórias / Observações</label>
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
    </div>
  );
}

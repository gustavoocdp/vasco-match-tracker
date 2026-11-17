# ⚽ Vasco Match Tracker

Aplicação Full-Stack (PWA) desenvolvida para registrar, acompanhar e analisar estatísticas pessoais de presença em estádios, aproveitamento esportivo e gastos financeiros em partidas do **Club de Regatas Vasco da Gama**.

🔗 **Acesse a aplicação ao vivo:** [vasco-match-tracker.vercel.app](https://vasco-match-tracker.vercel.app)

---

## 🚀 Funcionalidades

- **Dashboard de Estatísticas em Tempo Real:** Cálculo automático de total de partidas, aproveitamento percentual, saldo de vitórias/empates/derrotas e investimento total em ingressos.
- **Histórico & Filtros:** Listagem cronológica de partidas com filtragem por temporada (ano) e estádio.
- **Modo Administrador Protegido:** Autenticação via chave de API (`X-Admin-Key`) para criação, edição e exclusão de registros, mantendo a visualização pública segura para visitantes.
- **Progressive Web App (PWA):** Configurado com `manifest.json` para instalação nativa na tela inicial de dispositivos móveis.

---

## 🛠️ Arquitetura & Tecnologias

- **Frontend:** React, TypeScript, Vite, CSS responsivo (hospedado na **Vercel**)
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic (hospedado no **Render**)
- **Banco de Dados:** PostgreSQL serverless (**Neon**)

```text
vasco-match-tracker/
├── backend/          # API RESTful em FastAPI, modelos SQLAlchemy e validações
└── frontend/         # Interface SPA/PWA em React + TypeScript

💻 Como executar localmente
1. Clonar o repositório
git clone [https://github.com/gustavoocdp/vasco-match-tracker.git](https://github.com/gustavoocdp/vasco-match-tracker.git)
cd vasco-match-tracker

2. Configurar e rodar o Backend

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Crie um arquivo .env dentro da pasta backend/ com as variáveis abaixo e inicie o servidor:

DATABASE_URL=sqlite:///./vasco.db
ADMIN_KEY=sua_chave_secreta
CORS_ORIGINS=http://localhost:5173

uvicorn app.main:app --reload


3. Configurar e rodar o Frontend
cd frontend
npm install
 
 Crie um arquivo .env dentro da pasta frontend/ apontando para a API local e inicie a aplicação:

 VITE_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)

 npm run dev

 👨‍💻 Autor
Desenvolvido por Gustavo Carvalho de Paiva — Estudante de Engenharia da Computação (Universidade Veiga de Almeida).

<div align="center">

# InterviewAI

### Plataforma de Treinamento para Entrevistas com Inteligencia Artificial

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## Objetivo

O **InterviewAI** é uma plataforma web fullstack projetada para ajudar profissionais de tecnologia a praticar entrevistas de emprego com um intervieweiro alimentado por Inteligência Artificial.

O sistema permite que o usuario configure e realize simulacoes completas de entrevista, com chat em tempo real, reconhecimento de voz, scoring automatico por categorias e um dashboard detalhado de desempenho ao longo do tempo.

---

## Funcionalidades

### Autenticacao e Perfil
- Cadastro e login com JWT (access + refresh tokens)
- Gerenciamento de perfil (cargo, pais, nivel de experiencia, bio)
- Alteracao de senha com validacao

### Configuracao da Entrevista
- Selecao de titulo da vaga, idioma e pais
- Nivel de experiencia (Junior, Mid-Level, Senior, Specialist)
- Tipo de entrevista (Tecnica, Comportamental, HR, Mista)
- Estilo da empresa (Startup, Big Tech, Bank, Healthcare, etc.)
- Nivel de dificuldade (Easy, Medium, Hard, Expert)
- Duracao personalizada (5 a 120 minutos)
- Instrucoes customizadas para a IA

### Sessao de Entrevista
- Chat interativo com a IA em tempo real
- Reconhecimento de voz via Web Speech API
- Indicador de digitacao da IA
- Timer de duracao da sessao
- Mensagens salvas no historico

### IA e Respostas
- Integracao com Puter.js para geracao de respostas
- Sistema de fallback com respostas contextuais
- Prompt de sistema configuravel com base na configuracao
- Historico de conversa mantido durante a sessao

### Dashboard e Estatisticas
- Total de entrevistas realizadas
- Score medio geral
- Streak de dias consecutivos
- Percentual de melhoria ao longo do tempo
- Lista das entrevistas recentes

### Relatorio Pos-Entrevista
- Score geral da entrevista
- Scores por categoria (Technical Knowledge, Communication, Problem Solving, Confidence)
- Pontos fortes identificados
- Areas para melhoria
- Recomendacoes personalizadas

### Historico
- Lista completa de entrevistas passadas
- Filtro por status (completed, active)
- Acesso rápido a relatorios

---

## Tecnologias

### Backend

| Tecnologia | Versao | Descricao |
|---|---|---|
| **Python** | 3.11+ | Linguagem principal do backend |
| **FastAPI** | 0.115+ | Framework web assincrono |
| **SQLAlchemy** | 2.0+ | ORM com suporte a async |
| **aiosqlite** | 0.20+ | Driver async para SQLite |
| **Alembic** | 1.13+ | Gerenciador de migracoes |
| **Pydantic** | 2.9+ | Validacao de dados e serializacao |
| **python-jose** | 3.3+ | Criptografia e verificacao de JWT |
| **passlib + bcrypt** | 1.7+ / 4.0+ | Hashing de senhas |
| **Uvicorn** | 0.30+ | Servidor ASGI |

### Frontend (Next.js)

| Tecnologia | Descricao |
|---|---|
| **Next.js** | Framework React com App Router |
| **TypeScript** | Tipagem estatica |
| **React 19** | Biblioteca de UI |
| **Web Speech API** | Reconhecimento de voz nativo do navegador |
| **Puter.js** | SDK de IA para geracao de respostas |
| **CSS Custom Properties** | Sistema de temas (dark/light) |

### Infraestrutura

| Componente | Descricao |
|---|---|
| **PostgreSQL** | Banco de dados relacional (producao via Render) |
| **SQLite** | Banco de dados leve (desenvolvimento local) |
| **JWT** | Autenticacao stateless (access + refresh tokens) |
| **CORS** | Middleware para politicas de origem |
| **Security Headers** | X-Content-Type-Options, X-Frame-Options, XSS Protection |
| **Vercel** | Deploy do frontend (Next.js) |
| **Render** | Deploy do backend (FastAPI) + PostgreSQL |

---

## Arquitetura

```
ai-interview-platform/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entrada do FastAPI (API apenas)
│   │   ├── config.py                # Configuracoes via .env (Pydantic Settings)
│   │   ├── database.py              # Engine async + session factory (SQLite/PostgreSQL)
│   │   ├── dependencies.py          # Injecao de dependencia (auth)
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── router.py        # Definicao de todos os endpoints
│   │   ├── core/
│   │   │   ├── security.py          # JWT + hash de senhas
│   │   │   ├── middleware.py        # Logging + Security Headers
│   │   │   └── exceptions.py       # Excecoes customizadas HTTP
│   │   ├── models/                  # Modelos SQLAlchemy (ORM)
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   ├── interview.py
│   │   │   ├── score.py
│   │   │   ├── report.py
│   │   │   └── achievement.py
│   │   ├── schemas/                 # Schemas Pydantic (request/response)
│   │   │   ├── user.py
│   │   │   ├── interview.py
│   │   │   └── report.py
│   │   ├── repositories/            # Camada de acesso a dados
│   │   │   ├── user.py
│   │   │   ├── interview.py
│   │   │   └── report.py
│   │   └── services/                # Logica de negocio
│   │       ├── user.py
│   │       └── interview.py
│   ├── alembic/                     # Migracoes do banco
│   ├── requirements.txt
│   └── .env.example
│
├── frontend-next/                   # Frontend Next.js (App Router)
│   ├── app/
│   │   ├── layout.tsx               # Layout raiz + providers
│   │   ├── page.tsx                 # Redirect inicial
│   │   ├── globals.css              # Estilos globais (CSS puro)
│   │   ├── (auth)/                  # Rotas publicas
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/             # Rotas autenticadas (com Sidebar)
│   │   │   ├── layout.tsx           # Layout com Sidebar + auth guard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── new-interview/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── interview/[id]/page.tsx  # Sessao ao vivo (chat + voz)
│   │   └── report/[id]/page.tsx     # Relatorio pos-entrevista
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Toast.tsx
│   ├── lib/
│   │   ├── api.ts                   # Cliente API TypeScript
│   │   ├── store.tsx                # React Context (state)
│   │   └── utils.ts                 # Funcoes utilitarias
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── frontend/                        # Frontend vanilla JS (legado)
├── render.yaml                      # Configuracao do Render
├── Procfile                         # Start command para Render
├── .env                             # Variaveis de ambiente
└── .env.example                     # Template de configuracao
```

### Fluxo de Arquitetura

```
Frontend (Next.js - Vercel)
        │
        ▼
   FastAPI Router (/api/v1/*)
        │
        ▼
   Service Layer (Business Logic)
        │
        ▼
   Repository Layer (Data Access)
        │
        ▼
   SQLAlchemy ORM → PostgreSQL (Render) / SQLite (local)
```

---

## Prints

### Login
![Login](docs/screenshots/login.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Nova Entrevista
![New Interview](docs/screenshots/new-interview.png)

### Sessao de Entrevista
![Interview Session](docs/screenshots/interview.png)

### Relatorio
![Report](docs/screenshots/report.png)

### Historico
![History](docs/screenshots/history.png)

> **Nota:** Para adicionar os screenshots, crie a pasta `docs/screenshots/` e inclua as imagens com os nomes acima.

---

## Como Instalar

### Pre-requisitos

- Python 3.11 ou superior
- Node.js 18+ (para o frontend Next.js)
- Pip (gerenciador de pacotes)
- Navegador moderno (Chrome, Firefox, Edge)

### 1. Clonar o repositorio

```bash
git clone https://github.com/seu-usuario/ai-interview-platform.git
cd ai-interview-platform
```

### 2. Configurar o ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# (Opcional) Editar o .env com suas configuracoes
```

### 3. Instalar dependencias do backend

```bash
cd backend
pip install -r requirements.txt
```

### 4. Instalar dependencias do frontend

```bash
cd frontend-next
npm install
```

### 5. Iniciar o backend

```bash
cd backend
uvicorn app.main:app --reload
```

### 6. Iniciar o frontend (em outro terminal)

```bash
cd frontend-next
npm run dev
```

### 7. Acessar a aplicacao

Abra o navegador e acesse:

```
http://localhost:3000
```

### Variaveis de Ambiente (.env)

**Backend (.env):**

| Variavel | Padrao | Descricao |
|---|---|---|
| `APP_NAME` | AI Interview Platform | Nome da aplicacao |
| `APP_ENV` | development | Ambiente (development/production) |
| `DEBUG` | true | Modo debug (ativa /docs e /redoc) |
| `SECRET_KEY` | change-me | Chave secreta da aplicacao |
| `DATABASE_URL` | sqlite+aiosqlite:///./ai_interview.db | URL do banco de dados |
| `JWT_SECRET_KEY` | change-me-jwt | Chave secreta para JWT |
| `JWT_ALGORITHM` | HS256 | Algoritmo de assinatura JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | Tempo de vida do access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Tempo de vida do refresh token |

**Frontend (frontend-next/.env.local):**

| Variavel | Padrao | Descricao |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | http://localhost:8000/api/v1 | URL da API backend |

---

## Endpoints da API

### Autenticacao

| Metodo | Endpoint | Descricao | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Cadastrar usuario | Nao |
| POST | `/api/v1/auth/login` | Login e obter tokens | Nao |
| POST | `/api/v1/auth/refresh` | Renovar access token | Nao |
| GET | `/api/v1/auth/me` | Obter usuario atual | Sim |
| POST | `/api/v1/auth/change-password` | Alterar senha | Sim |

### Perfil

| Metodo | Endpoint | Descricao | Auth |
|---|---|---|---|
| GET | `/api/v1/profile` | Obter perfil | Sim |
| PUT | `/api/v1/profile` | Atualizar perfil | Sim |

### Entrevistas

| Metodo | Endpoint | Descricao | Auth |
|---|---|---|---|
| POST | `/api/v1/interviews/start` | Iniciar nova entrevista | Sim |
| GET | `/api/v1/interviews` | Listar entrevistas (paginado) | Sim |
| GET | `/api/v1/interviews/:id` | Obter entrevista por ID | Sim |
| POST | `/api/v1/interviews/:id/messages` | Enviar mensagem | Sim |
| GET | `/api/v1/interviews/:id/messages` | Obter mensagens | Sim |
| POST | `/api/v1/interviews/:id/end` | Finalizar entrevista | Sim |

### Dashboard e Relatorios

| Metodo | Endpoint | Descricao | Auth |
|---|---|---|---|
| GET | `/api/v1/dashboard/stats` | Estatisticas do usuario | Sim |
| GET | `/api/v1/reports/:session_id` | Obter relatorio | Sim |

---

## Roadmap

### v1.0 (Atual)
- [x] Autenticacao com JWT (access + refresh tokens)
- [x] CRUD de entrevistas
- [x] Chat com IA em tempo real
- [x] Reconhecimento de voz
- [x] Dashboard com estatisticas
- [x] Relatorio pos-entrevista
- [x] Sistema de temas (dark/light)
- [x] Historico de entrevistas
- [x] Gerenciamento de perfil

### v1.1 (Proximo)
- [ ] Scoring automático por mensagens usando IA
- [ ] Relatório salvo no banco ao finalizar entrevista
- [ ] Gráficos de evolução ao longo do tempo
- [ ] Exportar relatório em PDF
- [ ] Suporte a múltiplos idiomas no chat

### v2.0 (Futuro)
- [ ] Entrevistas em vídeo com avatar da IA
- [ ] Banco de perguntas por area de atuacao
- [ ] Modo observador (entrevistador assistindo)
- [ ] Comparacao com outros usuarios (anonymizado)
- [ ] Integracao com LinkedIn para perfil profissional
- [ ] Gamificacao com conquistas e ranking
- [ ] Deploy automatizado (Docker + CI/CD)

### Deploy
- [x] Frontend Next.js na Vercel
- [x] Backend FastAPI no Render
- [x] PostgreSQL no Render
- [x] Conexao com GitHub para deploy automatico

---

## Licenca

Este projeto esta sob a licenca MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Feito com dedicacao para a comunidade de tecnologia

</div>

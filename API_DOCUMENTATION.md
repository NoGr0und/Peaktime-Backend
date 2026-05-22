# Documentação da API - Peaktime Backend

Bem-vindo à documentação oficial da API do Peaktime, um sistema de gerenciamento para academias que conecta professores e alunos para acompanhamento de treinos, nutrição e metas.

## 🚀 Visão Geral

A API do Peaktime foi construída utilizando uma arquitetura modular baseada em plugins do Fastify, garantindo escalabilidade e facilidade de manutenção. O sistema utiliza **Supabase Auth** para autenticação e **Prisma ORM** com **PostgreSQL** para persistência de dados.

### Tecnologias Principais

- **Framework:** Fastify (TypeScript)
- **Banco de Dados:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Autenticação:** Supabase Auth (JWT)
- **Validação:** Zod
- **Documentação:** Swagger (@fastify/swagger)
- **Testes:** Vitest

---

## 🏗️ Arquitetura

O projeto segue um padrão de plugins por domínio (ex: `auth`, `enrollment`, `workouts`). Cada plugin contém:
- `*.routes.ts`: Definição de rotas e schemas de validação.
- `*.service.ts`: Lógica de negócio e interação com o banco de dados.
- `*.schema.ts`: Schemas Zod para validação de entrada/saída.

---

## 🔐 Autenticação

A maioria dos endpoints requer autenticação via Token JWT.
1. O usuário faz login via `/api/auth/login`.
2. O sistema retorna um `access_token`.
3. Todas as requisições subsequentes devem incluir o header:
   `Authorization: Bearer <seu_token>`

---

## 📍 Endpoints da API

A documentação interativa (Swagger) pode ser acessada em `/docs` quando o servidor estiver rodando.

### 👤 Autenticação (`/api/auth`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/login` | Autentica o usuário e retorna tokens JWT | Público |

### 🤝 Vínculo Professor/Aluno (`/api/enrollment`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/invite` | Gera um código de convite (6 caracteres) | PROFESSOR |
| POST | `/join` | Aluno usa código para se vincular a um professor | ALUNO |
| GET | `/students` | Lista todos os alunos vinculados ao professor | PROFESSOR |
| GET | `/professor` | Retorna os dados do professor do aluno logado | ALUNO |

### 🏋️ Treinos (`/api/workouts`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/plans` | Cria um plano semanal de treinos para um aluno | PROFESSOR |
| GET | `/today` | Retorna o treino planejado para o dia atual | ALUNO |
| POST | `/complete` | Marca um treino como concluído em uma data | ALUNO |

### 🍎 Nutrição (`/api/nutrition`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/meals` | Registra uma nova refeição (Café, Almoço, etc) | ALUNO |
| GET | `/meals` | Lista refeições de uma data específica (`?date=YYYY-MM-DD`) | ALUNO |
| DELETE | `/meals/:id` | Remove uma refeição registrada | ALUNO |
| GET | `/search` | Busca alimentos e macros na API Open Food Facts | Autenticado |

### ⚙️ Configurações (`/api/settings`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/push-token` | Registra o token para notificações push (Expo) | Autenticado |

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+)
- PostgreSQL (ou conta no Supabase)
- Arquivo `.env` configurado com `DATABASE_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

### Instalação
```bash
npm install
```

### Rodando em Desenvolvimento
```bash
npm run dev
```
A API estará disponível em `http://localhost:3333`.

### Executando Testes
```bash
npm test
```

---

## ⚠️ Tratamento de Erros

A API utiliza códigos HTTP padronizados:
- `400`: Erro de validação ou requisição malformada.
- `401`: Token ausente ou inválido.
- `403`: Usuário não tem permissão para acessar o recurso.
- `404`: Recurso não encontrado.
- `409`: Conflito (ex: treino já registrado para aquela data).

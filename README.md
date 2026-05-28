<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Fastify-v5-000000?logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth-3FCF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white" />
</p>

# 🏋️ Peaktime Backend

API REST para o aplicativo **Peaktime** — um sistema de acompanhamento fitness que conecta **professores** e **alunos**. Professores criam planos de treino semanais personalizados, enquanto alunos registram refeições, completam treinos diários e recebem notificações push.

> **Base URL:** `http://localhost:3333`  
> **Swagger UI:** `http://localhost:3333/docs`  
> **Versão:** 1.0.0

---

## 📑 Índice

- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Rodar](#-como-rodar)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Autenticação e Segurança](#-autenticação-e-segurança)
- [Diagrama de Entidade-Relacionamento](#-diagrama-de-entidade-relacionamento)
- [Modelos de Dados](#-modelos-de-dados)
- [Endpoints da API](#-endpoints-da-api)
  - [Health Check](#health-check)
  - [Auth — Autenticação](#auth--autenticação)
  - [Enrollment — Vínculo Professor ↔ Aluno](#enrollment--vínculo-professor--aluno)
  - [Workouts — Planos de Treino](#workouts--planos-de-treino)
  - [Nutrition — Nutrição e Refeições](#nutrition--nutrição-e-refeições)
  - [Settings — Configurações e Notificações Push](#settings--configurações-e-notificações-push)
- [Mapa de Rotas (Resumo)](#-mapa-de-rotas-resumo)
- [Diagrama de Fluxo do Aplicativo](#-diagrama-de-fluxo-do-aplicativo)
- [Códigos de Erro Padronizados](#-códigos-de-erro-padronizados)
- [Testes](#-testes)

---

## ✨ Funcionalidades

| Módulo         | Descrição                                                               |
| -------------- | ----------------------------------------------------------------------- |
| **Auth**       | Registro e login de usuários (Professor ou Aluno) via Supabase Auth     |
| **Enrollment** | Vínculo entre professor e aluno via código de convite (6 chars, 48h)    |
| **Workouts**   | Criação e acompanhamento de planos semanais de treino com exercícios    |
| **Nutrition**  | Registro de refeições, busca de alimentos via Open Food Facts           |
| **Settings**   | Registro de tokens para notificações push via Expo                     |

---

## 🛠 Stack Tecnológica

```
├── Runtime:         Node.js (v20+)
├── Framework:       Fastify v5
├── Linguagem:       TypeScript 6
├── ORM:             Prisma 6 (PostgreSQL)
├── Autenticação:    Supabase Auth (JWT Bearer Token)
├── Validação:       Zod
├── Documentação:    Swagger / OpenAPI 3.0 (@fastify/swagger)
└── Notificações:    Expo Push Notifications
```

---

## 📁 Estrutura do Projeto

```
peaktime-backend/
├── prisma/
│   └── schema.prisma              # Definição dos modelos e relacionamentos
├── src/
│   ├── app.ts                     # Configuração do Fastify, Swagger e plugins
│   ├── server.ts                  # Inicialização do servidor (porta 3333)
│   ├── lib/
│   │   ├── errors.ts              # Classe AppError (erros padronizados)
│   │   ├── prisma.ts              # Instância singleton do Prisma Client
│   │   └── supabase.ts            # Instância singleton do Supabase Client
│   ├── middleware/
│   │   └── authenticate.ts        # Middleware JWT + resolução do User local
│   └── plugins/
│       ├── auth/                   # Registro e Login
│       │   ├── auth.plugin.ts
│       │   ├── auth.routes.ts
│       │   ├── auth.service.ts
│       │   └── auth.schema.ts
│       ├── enrollment/             # Vínculo Professor ↔ Aluno
│       │   ├── enrollment.plugin.ts
│       │   ├── enrollment.routes.ts
│       │   ├── enrollment.service.ts
│       │   └── enrollment.schema.ts
│       ├── workouts/               # Planos de Treino Semanais
│       │   ├── workouts.plugin.ts
│       │   ├── workouts.routes.ts
│       │   ├── workouts.service.ts
│       │   └── workouts.schema.ts
│       ├── nutrition/              # Refeições e Busca de Alimentos
│       │   ├── nutrition.plugin.ts
│       │   ├── nutrition.routes.ts
│       │   ├── nutrition.service.ts
│       │   └── nutrition.schema.ts
│       └── settings/               # Push Tokens (Expo)
│           ├── settings.plugin.ts
│           ├── settings.routes.ts
│           ├── settings.service.ts
│           └── settings.schema.ts
├── tests/                          # Testes unitários e de integração (Vitest)
├── .env                            # Variáveis de ambiente (não comitado)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🚀 Como Rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) v20 ou superior
- Um projeto no [Supabase](https://supabase.com) (gratuito) com Authentication habilitado

### 1. Clone o repositório

```bash
git clone https://github.com/NoGr0und/Peaktime-Backend.git
cd Peaktime-Backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> Veja a seção [Variáveis de Ambiente](#-variáveis-de-ambiente) para detalhes.

### 4. Gere o Prisma Client e aplique as migrations

```bash
npx prisma generate
npx prisma db push
```

### 5. Inicie o servidor

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3333` e a documentação Swagger em `http://localhost:3333/docs`.

---

## 🔐 Variáveis de Ambiente

| Variável            | Obrigatória | Descrição                                          | Exemplo                                     |
| ------------------- | :---------: | -------------------------------------------------- | ------------------------------------------- |
| `DATABASE_URL`      | ✅          | Connection string do PostgreSQL (Prisma)            | `postgresql://user:pass@host:5432/dbname`   |
| `SUPABASE_URL`      | ✅          | URL base do projeto Supabase                        | `https://xxxxx.supabase.co`                 |
| `SUPABASE_ANON_KEY` | ✅          | Chave `anon` / `public` do projeto Supabase         | `eyJhbGciOiJIUzI1...`                      |
| `PORT`              | ❌          | Porta do servidor (default: `3333`)                 | `3333`                                      |

> **Onde encontrar SUPABASE_URL e SUPABASE_ANON_KEY:**  
> Supabase Dashboard → Selecione seu projeto → **Project Settings** (⚙️) → **API** → Copie *Project URL* e a chave *anon public*.

---

## 🔒 Autenticação e Segurança

A API utiliza **Supabase Auth** com tokens **JWT Bearer**.

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant App as 📱 Frontend
    participant API as 🖥️ Backend
    participant Supa as ☁️ Supabase Auth
    participant DB as 🗄️ PostgreSQL

    App->>API: POST /api/auth/register (email, senha, role)
    API->>Supa: supabase.auth.signUp()
    Supa-->>API: { user, session }
    API->>DB: prisma.user.create({ supabaseId, email, role... })
    DB-->>API: User criado
    API-->>App: { user, session: { access_token, refresh_token } }

    App->>API: POST /api/auth/login (email, senha)
    API->>Supa: supabase.auth.signInWithPassword()
    Supa-->>API: { session: { access_token, refresh_token } }
    API-->>App: { access_token, refresh_token }

    Note over App: Salva access_token localmente

    App->>API: GET /api/workouts/today (Authorization: Bearer <token>)
    API->>Supa: supabase.auth.getUser(token)
    Supa-->>API: { user: { id: supabaseId } }
    API->>DB: prisma.user.findUnique({ supabaseId })
    DB-->>API: User local (id, role, name...)
    API-->>App: Dados do treino do dia
```

### Middleware `authenticate`

Todas as rotas protegidas passam pelo middleware que:

1. Extrai o token do header `Authorization: Bearer <token>`
2. Valida o token com `supabase.auth.getUser(token)`
3. Busca o usuário correspondente no banco local pelo `supabaseId`
4. Injeta o objeto completo `user` (do banco local) em `request.user`

### Controle de Acesso por Role

| Role        | O que pode fazer                                                               |
| ----------- | ------------------------------------------------------------------------------ |
| `PROFESSOR` | Gerar convites, listar alunos, criar planos de treino                          |
| `ALUNO`     | Usar códigos de convite, ver professor, completar treinos, registrar refeições |

---

## 🗃 Diagrama de Entidade-Relacionamento

```mermaid
erDiagram
    User ||--o{ InviteCode : "cria (professor)"
    User ||--o{ Enrollment : "tem como professor"
    User ||--o{ Enrollment : "tem como aluno"
    User ||--o{ WeeklyPlan : "cria (professor)"
    User ||--o{ WeeklyPlan : "recebe (aluno)"
    User ||--o{ WorkoutCompletion : "completa"
    User ||--o{ Meal : "registra"
    User ||--o{ PushToken : "possui"

    InviteCode ||--o{ Enrollment : "origina"

    WeeklyPlan ||--o{ DayPlan : "contém"

    DayPlan ||--o{ Exercise : "contém"
    DayPlan ||--o{ WorkoutCompletion : "é completado em"

    Meal ||--o{ MealItem : "contém"

    User {
        UUID id PK
        String supabaseId UK
        String name
        String email UK
        String phone
        DateTime birthDate
        String avatarUrl
        Role role
        DateTime createdAt
        DateTime updatedAt
    }

    InviteCode {
        UUID id PK
        String code UK
        UUID professorId FK
        DateTime expiresAt
        DateTime createdAt
    }

    Enrollment {
        UUID id PK
        UUID professorId FK
        UUID studentId FK
        UUID inviteCodeId FK
        Boolean active
        DateTime createdAt
    }

    WeeklyPlan {
        UUID id PK
        String name
        UUID professorId FK
        UUID studentId FK
        Boolean active
        DateTime createdAt
    }

    DayPlan {
        UUID id PK
        UUID weeklyPlanId FK
        String dayOfWeek
        String name
    }

    Exercise {
        UUID id PK
        UUID dayPlanId FK
        String name
        Int sets
        Int reps
        Float loadKg
        Int restSeconds
        String notes
        Int order
    }

    WorkoutCompletion {
        UUID id PK
        UUID studentId FK
        UUID dayPlanId FK
        DateTime date
    }

    Meal {
        UUID id PK
        UUID studentId FK
        String type
        DateTime date
    }

    MealItem {
        UUID id PK
        UUID mealId FK
        String name
        Float quantity
        String unit
        Float calories
        Float protein
        Float carbs
        Float fat
    }

    PushToken {
        UUID id PK
        UUID userId FK
        String token UK
        DateTime createdAt
    }
```

---

## 📦 Modelos de Dados

### User

| Campo        | Tipo       | Descrição                                  |
| ------------ | ---------- | ------------------------------------------ |
| `id`         | `UUID`     | ID primário local (auto-gerado)            |
| `supabaseId` | `String`   | ID do usuário no Supabase Auth (unique)    |
| `name`       | `String`   | Nome completo                              |
| `email`      | `String`   | E-mail (unique)                            |
| `phone`      | `String?`  | Telefone (opcional)                        |
| `birthDate`  | `DateTime` | Data de nascimento                         |
| `avatarUrl`  | `String?`  | URL da foto de perfil (opcional)           |
| `role`       | `Role`     | `PROFESSOR` ou `ALUNO`                     |
| `createdAt`  | `DateTime` | Data de criação                            |
| `updatedAt`  | `DateTime` | Data da última atualização                 |

### InviteCode

| Campo         | Tipo       | Descrição                                    |
| ------------- | ---------- | -------------------------------------------- |
| `id`          | `UUID`     | ID primário                                  |
| `code`        | `String`   | Código de 6 caracteres hex (unique)          |
| `professorId` | `UUID`     | FK → User (professor que criou)              |
| `expiresAt`   | `DateTime` | Expira 48h após criação                      |
| `createdAt`   | `DateTime` | Data de criação                              |

### Enrollment

| Campo          | Tipo      | Descrição                                |
| -------------- | --------- | ---------------------------------------- |
| `id`           | `UUID`    | ID primário                              |
| `professorId`  | `UUID`    | FK → User (professor)                   |
| `studentId`    | `UUID`    | FK → User (aluno)                       |
| `inviteCodeId` | `UUID?`   | FK → InviteCode                         |
| `active`       | `Boolean` | Se o vínculo está ativo (default: true)  |
| `createdAt`    | `DateTime`| Data de criação                          |

### WeeklyPlan

| Campo         | Tipo       | Descrição                                    |
| ------------- | ---------- | -------------------------------------------- |
| `id`          | `UUID`     | ID primário                                  |
| `name`        | `String`   | Nome do plano (ex: "Hipertrofia Semana 1")   |
| `professorId` | `UUID`     | FK → User (professor)                        |
| `studentId`   | `UUID`     | FK → User (aluno)                            |
| `active`      | `Boolean`  | Se o plano está ativo (default: true)        |
| `createdAt`   | `DateTime` | Data de criação                              |

### DayPlan

| Campo          | Tipo     | Descrição                                        |
| -------------- | -------- | ------------------------------------------------ |
| `id`           | `UUID`   | ID primário                                      |
| `weeklyPlanId` | `UUID`   | FK → WeeklyPlan                                 |
| `dayOfWeek`    | `String` | `MONDAY` \| `TUESDAY` \| ... \| `SUNDAY`        |
| `name`         | `String` | Nome do treino do dia (ex: "Peito e Tríceps")   |

### Exercise

| Campo         | Tipo      | Descrição                              |
| ------------- | --------- | -------------------------------------- |
| `id`          | `UUID`    | ID primário                            |
| `dayPlanId`   | `UUID`    | FK → DayPlan                          |
| `name`        | `String`  | Nome do exercício                      |
| `sets`        | `Int`     | Número de séries                       |
| `reps`        | `Int`     | Número de repetições                   |
| `loadKg`      | `Float?`  | Carga em kg (opcional)                 |
| `restSeconds` | `Int?`    | Descanso em segundos (opcional)        |
| `notes`       | `String?` | Observações do professor (opcional)    |
| `order`       | `Int`     | Ordem do exercício no dia              |

### WorkoutCompletion

| Campo       | Tipo       | Descrição                              |
| ----------- | ---------- | -------------------------------------- |
| `id`        | `UUID`     | ID primário                            |
| `studentId` | `UUID`     | FK → User (aluno)                     |
| `dayPlanId` | `UUID`     | FK → DayPlan                          |
| `date`      | `DateTime` | Data da conclusão                      |

> ⚠️ **Constraint:** `@@unique([studentId, dayPlanId, date])` — Impede marcar o mesmo treino como completo mais de uma vez no mesmo dia.

### Meal

| Campo       | Tipo       | Descrição                                                 |
| ----------- | ---------- | --------------------------------------------------------- |
| `id`        | `UUID`     | ID primário                                               |
| `studentId` | `UUID`     | FK → User (aluno)                                        |
| `type`      | `String`   | `BREAKFAST` \| `LUNCH` \| `SNACK` \| `DINNER`            |
| `date`      | `DateTime` | Data da refeição                                          |

> ⚠️ **Constraint:** `@@unique([studentId, type, date])` — Um aluno não pode ter duas refeições do mesmo tipo no mesmo dia.

### MealItem

| Campo      | Tipo     | Descrição                             |
| ---------- | -------- | ------------------------------------- |
| `id`       | `UUID`   | ID primário                           |
| `mealId`   | `UUID`   | FK → Meal                            |
| `name`     | `String` | Nome do alimento                      |
| `quantity` | `Float`  | Quantidade                            |
| `unit`     | `String` | Unidade (g, ml, unidade...)           |
| `calories` | `Float?` | Calorias (opcional)                   |
| `protein`  | `Float?` | Proteína em g (opcional)              |
| `carbs`    | `Float?` | Carboidratos em g (opcional)          |
| `fat`      | `Float?` | Gordura em g (opcional)               |

### PushToken

| Campo      | Tipo       | Descrição                    |
| ---------- | ---------- | ---------------------------- |
| `id`       | `UUID`     | ID primário                  |
| `userId`   | `UUID`     | FK → User                   |
| `token`    | `String`   | Expo Push Token (unique)     |
| `createdAt`| `DateTime` | Data de registro             |

---

## 📡 Endpoints da API

### Health Check

#### `GET /health`

Verifica se o servidor está online.

- **Autenticação:** ❌ Não requerida

**Response `200`:**

```json
{ "status": "ok" }
```

---

### Auth — Autenticação

> **Prefixo:** `/api/auth` · **Autenticação:** ❌ Não requerida (rotas públicas)

---

#### `POST /api/auth/register`

Cadastra um novo usuário (professor ou aluno) no Supabase Auth e no banco local.

**Request Body:**

| Campo      | Tipo     | Obrigatório | Validação                   | Exemplo                            |
| ---------- | -------- | :---------: | --------------------------- | ---------------------------------- |
| `email`    | `string` | ✅          | E-mail válido               | `"aluno@email.com"`                |
| `password` | `string` | ✅          | Mínimo 6 caracteres         | `"senha123"`                       |
| `name`     | `string` | ✅          | Mínimo 2 caracteres         | `"João Silva"`                     |
| `birthDate`| `string` | ✅          | ISO 8601                    | `"1995-10-25T00:00:00.000Z"`      |
| `role`     | `string` | ✅          | `"PROFESSOR"` ou `"ALUNO"`  | `"ALUNO"`                          |
| `phone`    | `string` | ❌          | —                           | `"11999999999"`                    |
| `avatarUrl`| `string` | ❌          | URL válida                  | `"https://example.com/avatar.jpg"` |

<details>
<summary><b>Exemplo de Request</b></summary>

```json
{
  "email": "aluno@email.com",
  "password": "senha123",
  "name": "João Silva",
  "birthDate": "1995-10-25T00:00:00.000Z",
  "role": "ALUNO",
  "phone": "11999999999"
}
```

</details>

**Response `200`:**

```json
{
  "user": {
    "id": "uuid-local",
    "name": "João Silva",
    "email": "aluno@email.com",
    "role": "ALUNO",
    "birthDate": "1995-10-25T00:00:00.000Z",
    "phone": "11999999999",
    "avatarUrl": null
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1...",
    "refresh_token": "refresh-token-value"
  }
}
```

> **Nota:** Se a confirmação de e-mail estiver ativada no Supabase, `session` será `null` até a confirmação.

| Status | Code                  | Descrição                     |
| ------ | --------------------- | ----------------------------- |
| `400`  | `USER_ALREADY_EXISTS` | E-mail já cadastrado          |
| `400`  | `REGISTRATION_FAILED` | Erro no Supabase Auth         |
| `400`  | Validation Error      | Campos inválidos (Zod)        |
| `500`  | `DATABASE_ERROR`      | Erro ao salvar no banco local |

---

#### `POST /api/auth/login`

Autentica um usuário existente e retorna tokens JWT.

**Request Body:**

| Campo      | Tipo     | Obrigatório | Validação              |
| ---------- | -------- | :---------: | ---------------------- |
| `email`    | `string` | ✅          | E-mail válido          |
| `password` | `string` | ✅          | Mínimo 6 caracteres    |

**Response `200`:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "refresh-token-value"
}
```

| Status | Code          | Descrição                                      |
| ------ | ------------- | ---------------------------------------------- |
| `401`  | `AUTH_FAILED` | Credenciais inválidas ou e-mail não confirmado |

---

### Enrollment — Vínculo Professor ↔ Aluno

> **Prefixo:** `/api/enrollment` · **Autenticação:** ✅ `Authorization: Bearer <token>`

---

#### `POST /api/enrollment/invite`

Professor gera um código de convite de 6 caracteres (hex) válido por **48 horas**.

- 🔐 **Role:** `PROFESSOR` apenas
- **Body:** Nenhum

**Response `200`:**

```json
{
  "id": "uuid-do-convite",
  "code": "A1B2C3",
  "professorId": "uuid-do-professor",
  "expiresAt": "2026-05-30T10:38:00.000Z",
  "createdAt": "2026-05-28T10:38:00.000Z"
}
```

| Status | Code         | Descrição                                |
| ------ | ------------ | ---------------------------------------- |
| `403`  | `FORBIDDEN`  | Apenas professores podem gerar convites  |

---

#### `POST /api/enrollment/join`

Aluno usa um código de convite para se vincular a um professor.

- 🔐 **Role:** `ALUNO` apenas

**Request Body:**

| Campo  | Tipo     | Obrigatório | Validação                |
| ------ | -------- | :---------: | ------------------------ |
| `code` | `string` | ✅          | Exatamente 6 caracteres  |

**Response `200`:**

```json
{
  "id": "uuid-do-enrollment",
  "professorId": "uuid-do-professor",
  "studentId": "uuid-do-aluno",
  "inviteCodeId": "uuid-do-convite",
  "active": true,
  "createdAt": "2026-05-28T10:40:00.000Z"
}
```

| Status | Code               | Descrição                            |
| ------ | ------------------ | ------------------------------------ |
| `400`  | `INVALID_CODE`     | Código inválido ou expirado          |
| `403`  | `FORBIDDEN`        | Apenas alunos podem usar convites    |
| `409`  | `ALREADY_ENROLLED` | Aluno já vinculado a este professor  |

---

#### `GET /api/enrollment/students`

Professor lista todos os alunos ativamente vinculados.

**Response `200`:**

```json
[
  {
    "id": "uuid-do-enrollment",
    "professorId": "uuid-do-professor",
    "studentId": "uuid-do-aluno",
    "active": true,
    "student": {
      "id": "uuid-do-aluno",
      "name": "Maria Aluna",
      "email": "maria@email.com",
      "avatarUrl": "https://example.com/maria.jpg"
    }
  }
]
```

---

#### `GET /api/enrollment/professor`

Aluno visualiza o professor vinculado a ele.

**Response `200`:**

```json
{
  "id": "uuid-do-enrollment",
  "professorId": "uuid-do-professor",
  "studentId": "uuid-do-aluno",
  "active": true,
  "professor": {
    "id": "uuid-do-professor",
    "name": "Carlos Professor",
    "email": "carlos@email.com",
    "avatarUrl": null
  }
}
```

> Retorna `null` se o aluno não estiver vinculado a nenhum professor.

---

### Workouts — Planos de Treino

> **Prefixo:** `/api/workouts` · **Autenticação:** ✅ `Authorization: Bearer <token>`

---

#### `POST /api/workouts/plans`

Professor cria um plano semanal completo com dias e exercícios para um aluno.

- 🔐 **Role:** `PROFESSOR` apenas

**Request Body:**

| Campo       | Tipo     | Obrigatório | Descrição                   |
| ----------- | -------- | :---------: | --------------------------- |
| `studentId` | `string` | ✅          | UUID do aluno destinatário  |
| `name`      | `string` | ✅          | Nome do plano               |
| `days`      | `array`  | ✅          | Lista de dias (ver abaixo)  |

**Objeto `days[i]`:**

| Campo       | Tipo     | Obrigatório | Valores aceitos                                                               |
| ----------- | -------- | :---------: | ----------------------------------------------------------------------------- |
| `dayOfWeek` | `string` | ✅          | `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` |
| `name`      | `string` | ✅          | Nome do treino do dia                                                         |
| `exercises` | `array`  | ✅          | Lista de exercícios (ver abaixo)                                              |

**Objeto `days[i].exercises[j]`:**

| Campo         | Tipo      | Obrigatório | Descrição                       |
| ------------- | --------- | :---------: | ------------------------------- |
| `name`        | `string`  | ✅          | Nome do exercício               |
| `sets`        | `integer` | ✅          | Séries (≥ 1)                    |
| `reps`        | `integer` | ✅          | Repetições (≥ 1)                |
| `order`       | `integer` | ✅          | Ordem no dia (≥ 0)              |
| `loadKg`      | `number`  | ❌          | Carga em kg                     |
| `restSeconds` | `integer` | ❌          | Descanso em segundos            |
| `notes`       | `string`  | ❌          | Observações                     |

<details>
<summary><b>Exemplo de Request</b></summary>

```json
{
  "studentId": "uuid-do-aluno",
  "name": "Hipertrofia - Semana 1",
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "name": "Peito e Tríceps",
      "exercises": [
        { "name": "Supino Reto", "sets": 4, "reps": 10, "loadKg": 60, "restSeconds": 60, "notes": "Focar na cadência", "order": 0 },
        { "name": "Tríceps Pulley", "sets": 3, "reps": 12, "loadKg": 25, "restSeconds": 45, "order": 1 }
      ]
    },
    {
      "dayOfWeek": "WEDNESDAY",
      "name": "Costas e Bíceps",
      "exercises": [
        { "name": "Puxada Frontal", "sets": 4, "reps": 10, "loadKg": 50, "order": 0 }
      ]
    }
  ]
}
```

</details>

**Response `200`:** Retorna o plano completo criado com `id`s gerados para cada `WeeklyPlan`, `DayPlan` e `Exercise`.

| Status | Code        | Descrição                             |
| ------ | ----------- | ------------------------------------- |
| `403`  | `FORBIDDEN` | Apenas professores podem criar planos |

---

#### `GET /api/workouts/today`

Retorna o treino do dia atual (baseado no dia da semana) do plano ativo do aluno autenticado.

**Response `200` (com treino):**

```json
{
  "id": "uuid-do-day-plan",
  "dayOfWeek": "WEDNESDAY",
  "name": "Costas e Bíceps",
  "exercises": [
    { "id": "uuid", "name": "Puxada Frontal", "sets": 4, "reps": 10, "loadKg": 50, "order": 0 }
  ]
}
```

**Response `200` (sem treino hoje):**

```json
{ "message": "No workout today" }
```

---

#### `POST /api/workouts/complete`

Aluno marca um dia de treino como completo.

- 🔐 **Role:** `ALUNO` apenas

**Request Body:**

| Campo       | Tipo     | Obrigatório | Descrição                   |
| ----------- | -------- | :---------: | --------------------------- |
| `dayPlanId` | `string` | ✅          | UUID do DayPlan             |
| `date`      | `string` | ✅          | Data/hora ISO 8601          |

**Response `200`:**

```json
{
  "id": "uuid-da-completion",
  "studentId": "uuid-do-aluno",
  "dayPlanId": "uuid-do-day-plan",
  "date": "2026-05-28T18:30:00.000Z"
}
```

| Status | Code                | Descrição                                 |
| ------ | ------------------- | ----------------------------------------- |
| `403`  | `FORBIDDEN`         | Apenas alunos podem marcar treinos        |
| `409`  | `ALREADY_COMPLETED` | Treino já marcado como completo neste dia |

---

### Nutrition — Nutrição e Refeições

> **Prefixo:** `/api/nutrition` · **Autenticação:** ✅ `Authorization: Bearer <token>`

---

#### `POST /api/nutrition/meals`

Aluno registra uma refeição com itens alimentares.

- 🔐 **Role:** `ALUNO` apenas

**Request Body:**

| Campo   | Tipo     | Obrigatório | Valores aceitos                          |
| ------- | -------- | :---------: | ---------------------------------------- |
| `type`  | `string` | ✅          | `BREAKFAST`, `LUNCH`, `SNACK`, `DINNER`  |
| `date`  | `string` | ✅          | Data/hora ISO 8601                       |
| `items` | `array`  | ✅          | Lista de itens alimentares (ver abaixo)  |

**Objeto `items[i]`:**

| Campo      | Tipo     | Obrigatório | Descrição                       |
| ---------- | -------- | :---------: | ------------------------------- |
| `name`     | `string` | ✅          | Nome do alimento                |
| `quantity` | `number` | ✅          | Quantidade (> 0)                |
| `unit`     | `string` | ✅          | Unidade (g, ml, unidade, etc.)  |
| `calories` | `number` | ❌          | Calorias                        |
| `protein`  | `number` | ❌          | Proteína (g)                    |
| `carbs`    | `number` | ❌          | Carboidratos (g)                |
| `fat`      | `number` | ❌          | Gordura (g)                     |

<details>
<summary><b>Exemplo de Request</b></summary>

```json
{
  "type": "LUNCH",
  "date": "2026-05-28T12:30:00.000Z",
  "items": [
    { "name": "Arroz Integral", "quantity": 150, "unit": "g", "calories": 180, "protein": 4, "carbs": 38, "fat": 1 },
    { "name": "Peito de Frango", "quantity": 120, "unit": "g", "calories": 198, "protein": 37, "carbs": 0, "fat": 4.5 }
  ]
}
```

</details>

**Response `200`:** Retorna a refeição criada com `id`s gerados para `Meal` e cada `MealItem`.

| Status | Code             | Descrição                                                 |
| ------ | ---------------- | --------------------------------------------------------- |
| `403`  | `FORBIDDEN`      | Apenas alunos podem registrar refeições                   |
| `409`  | `ALREADY_EXISTS` | Refeição duplicada (mesmo tipo + mesmo dia + mesmo aluno) |

---

#### `GET /api/nutrition/meals?date=YYYY-MM-DD`

Lista todas as refeições do aluno autenticado em uma data específica.

| Query Param | Tipo     | Obrigatório | Formato      | Exemplo      |
| ----------- | -------- | :---------: | ------------ | ------------ |
| `date`      | `string` | ✅          | `YYYY-MM-DD` | `2026-05-28` |

**Response `200`:** Array de refeições com seus itens.

| Status | Code           | Descrição                     |
| ------ | -------------- | ----------------------------- |
| `400`  | `MISSING_DATE` | Parâmetro `date` não enviado  |

---

#### `DELETE /api/nutrition/meals/:id`

Remove uma refeição. Somente o dono (aluno que criou) pode deletar.

| Path Param | Tipo     | Descrição                  |
| ---------- | -------- | -------------------------- |
| `id`       | `string` | UUID da refeição a deletar |

**Response `200`:**

```json
{ "success": true }
```

| Status | Code        | Descrição                          |
| ------ | ----------- | ---------------------------------- |
| `403`  | `FORBIDDEN` | Refeição pertence a outro usuário  |
| `404`  | `NOT_FOUND` | Refeição não encontrada            |

---

#### `GET /api/nutrition/search?q=termo`

Busca alimentos na API **Open Food Facts**. Retorna até 10 resultados com informações nutricionais por 100g.

| Query Param | Tipo     | Obrigatório | Descrição       |
| ----------- | -------- | :---------: | --------------- |
| `q`         | `string` | ✅          | Termo de busca  |

**Response `200`:**

```json
[
  {
    "name": "Banana",
    "caloriesPer100g": 89,
    "proteinPer100g": 1.09,
    "carbsPer100g": 22.84,
    "fatPer100g": 0.33
  }
]
```

| Status | Code            | Descrição                          |
| ------ | --------------- | ---------------------------------- |
| `400`  | `MISSING_QUERY` | Parâmetro `q` não enviado          |
| `502`  | `API_ERROR`     | Falha ao consultar Open Food Facts |

---

### Settings — Configurações e Notificações Push

> **Prefixo:** `/api/settings` · **Autenticação:** ✅ `Authorization: Bearer <token>`

---

#### `POST /api/settings/push-token`

Salva ou atualiza o Expo Push Token do dispositivo para notificações push.

**Request Body:**

| Campo   | Tipo     | Obrigatório | Descrição                                       |
| ------- | -------- | :---------: | ----------------------------------------------- |
| `token` | `string` | ✅          | Expo Push Token (ex: `ExponentPushToken[xxx]`)  |

**Response `200`:**

```json
{ "success": true }
```

> Se o token já existir, atualiza o `userId` associado (upsert).

---

## 🗺 Mapa de Rotas (Resumo)

| Método   | Rota                         | Autenticação | Role        | Descrição                           |
| -------- | ---------------------------- | :----------: | ----------- | ----------------------------------- |
| `GET`    | `/health`                    | ❌           | —           | Health check                        |
| `POST`   | `/api/auth/register`         | ❌           | —           | Cadastrar novo usuário              |
| `POST`   | `/api/auth/login`            | ❌           | —           | Login (retorna JWT)                 |
| `POST`   | `/api/enrollment/invite`     | ✅           | `PROFESSOR` | Gerar código de convite             |
| `POST`   | `/api/enrollment/join`       | ✅           | `ALUNO`     | Usar código de convite              |
| `GET`    | `/api/enrollment/students`   | ✅           | `PROFESSOR` | Listar alunos vinculados            |
| `GET`    | `/api/enrollment/professor`  | ✅           | `ALUNO`     | Ver professor vinculado             |
| `POST`   | `/api/workouts/plans`        | ✅           | `PROFESSOR` | Criar plano de treino semanal       |
| `GET`    | `/api/workouts/today`        | ✅           | Qualquer    | Treino do dia atual                 |
| `POST`   | `/api/workouts/complete`     | ✅           | `ALUNO`     | Marcar treino como feito            |
| `POST`   | `/api/nutrition/meals`       | ✅           | `ALUNO`     | Registrar refeição                  |
| `GET`    | `/api/nutrition/meals`       | ✅           | Qualquer    | Listar refeições do dia             |
| `DELETE` | `/api/nutrition/meals/:id`   | ✅           | Qualquer    | Deletar refeição (somente dono)     |
| `GET`    | `/api/nutrition/search`      | ✅           | Qualquer    | Buscar alimentos (Open Food Facts)  |
| `POST`   | `/api/settings/push-token`   | ✅           | Qualquer    | Registrar token Expo Push           |

---

## 🔄 Diagrama de Fluxo do Aplicativo

```mermaid
flowchart TD
    Start([Abrir App]) --> HasAccount{Tem conta?}
    
    HasAccount -->|Não| Register["POST /api/auth/register\n(escolhe PROFESSOR ou ALUNO)"]
    HasAccount -->|Sim| Login["POST /api/auth/login\n(recebe access_token)"]
    Register --> Login
    
    Login --> CheckRole{Qual role?}
    
    CheckRole -->|PROFESSOR| ProfFlow
    CheckRole -->|ALUNO| AlunoFlow
    
    subgraph ProfFlow ["🎓 Fluxo do Professor"]
        GenInvite["POST /api/enrollment/invite\n(gera código 6 chars)"] --> ShareCode[Compartilha código\ncom o aluno]
        ListStudents["GET /api/enrollment/students\n(lista alunos vinculados)"]
        CreatePlan["POST /api/workouts/plans\n(cria plano semanal\ncom dias e exercícios)"]
    end
    
    subgraph AlunoFlow ["🏃 Fluxo do Aluno"]
        JoinCode["POST /api/enrollment/join\n(usa código do professor)"] --> ViewProf["GET /api/enrollment/professor\n(vê professor vinculado)"]
        TodayWorkout["GET /api/workouts/today\n(treino do dia)"] --> CompleteWorkout["POST /api/workouts/complete\n(marca treino como feito)"]
        SearchFood["GET /api/nutrition/search?q=...\n(busca alimentos)"] --> LogMeal["POST /api/nutrition/meals\n(registra refeição)"]
        ViewMeals["GET /api/nutrition/meals?date=...\n(refeições do dia)"]
        DeleteMeal["DELETE /api/nutrition/meals/:id\n(remove refeição)"]
    end
    
    ProfFlow --> PushToken
    AlunoFlow --> PushToken
    
    PushToken["POST /api/settings/push-token\n(registra token Expo Push)"]
```

---

## ⚠️ Códigos de Erro Padronizados

Todos os erros seguem o formato:

```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "error": "Unauthorized",
  "message": "No authorization header"
}
```

| Status | Code                  | Descrição                                                |
| ------ | --------------------- | -------------------------------------------------------- |
| `400`  | Validation Error      | Campos do body inválidos (Zod)                           |
| `400`  | `USER_ALREADY_EXISTS` | E-mail já cadastrado                                     |
| `400`  | `REGISTRATION_FAILED` | Erro no cadastro do Supabase Auth                        |
| `400`  | `INVALID_CODE`        | Código de convite inválido ou expirado                   |
| `400`  | `MISSING_DATE`        | Parâmetro `date` ausente                                 |
| `400`  | `MISSING_QUERY`       | Parâmetro `q` ausente                                    |
| `401`  | `UNAUTHORIZED`        | Token ausente, inválido, ou usuário não encontrado no DB |
| `401`  | `AUTH_FAILED`         | Credenciais inválidas ou e-mail não confirmado           |
| `403`  | `FORBIDDEN`           | Usuário não tem a role necessária para a ação            |
| `404`  | `NOT_FOUND`           | Recurso não encontrado                                   |
| `409`  | `ALREADY_ENROLLED`    | Aluno já vinculado ao professor                          |
| `409`  | `ALREADY_COMPLETED`   | Treino já marcado como completo nesta data               |
| `409`  | `ALREADY_EXISTS`      | Refeição duplicada                                       |
| `500`  | `DATABASE_ERROR`      | Erro interno do banco de dados                           |
| `502`  | `API_ERROR`           | Erro ao consultar API externa (Open Food Facts)          |

---

## 🧪 Testes

O projeto utiliza [Vitest](https://vitest.dev/) para testes unitários e de integração.

```bash
# Rodar todos os testes
npm run test
```

Os testes cobrem:
- **Middleware de autenticação** — validação de tokens, resolução de usuário local
- **Serviços** — lógica de negócio (auth, enrollment, workouts, nutrition, settings)
- **Rotas** — integração de ponta a ponta com mocks do Supabase e Prisma

---

<p align="center">
  <b>Peaktime Backend</b> · Feito com 💪 para conectar professores e alunos
</p>

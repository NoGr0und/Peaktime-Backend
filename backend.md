# 📋 Peaktime Backend — Documentação Completa da API

> **Base URL:** `http://localhost:3333`
> **Swagger UI:** `http://localhost:3333/docs`
> **Versão:** 1.0.0

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Autenticação](#autenticação)
4. [Modelos de Dados](#modelos-de-dados)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Auth — Autenticação](#auth--autenticação)
   - [Enrollment — Vínculo Professor ↔ Aluno](#enrollment--vínculo-professor--aluno)
   - [Workouts — Planos de Treino](#workouts--planos-de-treino)
   - [Nutrition — Nutrição e Refeições](#nutrition--nutrição-e-refeições)
   - [Settings — Configurações e Notificações](#settings--configurações-e-notificações)
6. [Códigos de Erro](#códigos-de-erro)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Visão Geral

O **Peaktime Backend** é a API REST do aplicativo Peaktime, um sistema de acompanhamento fitness que conecta **professores** e **alunos**. Professores podem criar planos de treino semanais e acompanhar a evolução de seus alunos, enquanto alunos registram refeições, completam treinos diários e recebem notificações push.

### Funcionalidades Principais

| Módulo       | Descrição                                                          |
| ------------ | ------------------------------------------------------------------ |
| **Auth**       | Registro e login de usuários (Professor ou Aluno) via Supabase Auth |
| **Enrollment** | Vínculo entre professor e aluno via código de convite               |
| **Workouts**   | Criação e acompanhamento de planos semanais de treino               |
| **Nutrition**  | Registro de refeições, busca de alimentos (Open Food Facts)         |
| **Settings**   | Registro de tokens para notificações push (Expo)                   |

---

## Arquitetura

```
Stack Tecnológica
├── Runtime:         Node.js
├── Framework:       Fastify v5
├── Linguagem:       TypeScript
├── ORM:             Prisma (PostgreSQL)
├── Autenticação:    Supabase Auth (JWT Bearer Token)
├── Validação:       Zod
├── Documentação:    Swagger/OpenAPI 3.0 (via @fastify/swagger)
└── Push:            Expo Push Notifications
```

### Estrutura de Diretórios

```
src/
├── app.ts                         # Configuração do Fastify, Swagger, registro de plugins
├── server.ts                      # Inicialização do servidor (porta 3333)
├── lib/
│   ├── errors.ts                  # Classe AppError para erros padronizados
│   ├── prisma.ts                  # Instância do Prisma Client
│   └── supabase.ts                # Instância do Supabase Client
├── middleware/
│   └── authenticate.ts            # Middleware de autenticação (valida JWT + resolve User local)
└── plugins/
    ├── auth/                      # Login e Registro
    ├── enrollment/                # Vínculo Professor ↔ Aluno
    ├── workouts/                  # Planos de treino semanais
    ├── nutrition/                 # Refeições e busca de alimentos
    └── settings/                  # Push tokens
```

---

## Autenticação

A API utiliza **Supabase Auth** com tokens **JWT Bearer**. O fluxo funciona da seguinte forma:

### Fluxo de Autenticação

```
1. Cliente chama POST /api/auth/register → Cria conta no Supabase + banco local
2. Cliente chama POST /api/auth/login    → Recebe access_token e refresh_token
3. Cliente envia o access_token em todas as requisições protegidas:
   Authorization: Bearer <access_token>
```

### Middleware de Autenticação

Todas as rotas (exceto `/api/auth/login`, `/api/auth/register` e `/health`) passam pelo middleware `authenticate`, que:

1. Extrai o token do header `Authorization: Bearer <token>`
2. Valida o token com `supabase.auth.getUser(token)`
3. Busca o usuário correspondente no banco local pelo `supabaseId`
4. Injeta o objeto `user` (do banco local) em `request.user`

O `request.user` contém todos os campos do modelo `User` do Prisma, incluindo `id`, `role`, `name`, `email`, etc.

### Controle de Acesso por Role

| Role         | Permissões                                                                    |
| ------------ | ----------------------------------------------------------------------------- |
| `PROFESSOR`  | Gerar convites, listar alunos, criar planos de treino                         |
| `ALUNO`      | Usar códigos de convite, ver professor, completar treinos, registrar refeições |

---

## Modelos de Dados

### User

| Campo       | Tipo       | Descrição                                     |
| ----------- | ---------- | --------------------------------------------- |
| `id`        | `UUID`     | ID primário local (gerado automaticamente)     |
| `supabaseId`| `String`   | ID do usuário no Supabase Auth (unique)        |
| `name`      | `String`   | Nome completo                                  |
| `email`     | `String`   | E-mail (unique)                                |
| `phone`     | `String?`  | Telefone (opcional)                            |
| `birthDate` | `DateTime` | Data de nascimento                             |
| `avatarUrl` | `String?`  | URL da foto de perfil (opcional)               |
| `role`      | `Role`     | `PROFESSOR` ou `ALUNO`                         |
| `createdAt` | `DateTime` | Data de criação                                |
| `updatedAt` | `DateTime` | Data da última atualização                     |

### InviteCode

| Campo        | Tipo       | Descrição                                 |
| ------------ | ---------- | ----------------------------------------- |
| `id`         | `UUID`     | ID primário                                |
| `code`       | `String`   | Código de 6 caracteres hexadecimais (unique) |
| `professorId`| `UUID`     | FK → User (professor que criou)            |
| `expiresAt`  | `DateTime` | Data de expiração (48h após criação)       |
| `createdAt`  | `DateTime` | Data de criação                            |

### Enrollment

| Campo          | Tipo       | Descrição                               |
| -------------- | ---------- | --------------------------------------- |
| `id`           | `UUID`     | ID primário                              |
| `professorId`  | `UUID`     | FK → User (professor)                   |
| `studentId`    | `UUID`     | FK → User (aluno)                       |
| `inviteCodeId` | `UUID?`    | FK → InviteCode (opcional)              |
| `active`       | `Boolean`  | Se o vínculo está ativo (default: true)  |
| `createdAt`    | `DateTime` | Data de criação                          |

### WeeklyPlan

| Campo        | Tipo       | Descrição                                |
| ------------ | ---------- | ---------------------------------------- |
| `id`         | `UUID`     | ID primário                               |
| `name`       | `String`   | Nome do plano (ex: "Hipertrofia Semana 1") |
| `professorId`| `UUID`     | FK → User (professor que criou)           |
| `studentId`  | `UUID`     | FK → User (aluno destinatário)            |
| `active`     | `Boolean`  | Se o plano está ativo (default: true)     |
| `createdAt`  | `DateTime` | Data de criação                           |
| `days`       | `DayPlan[]`| Lista de dias do plano                    |

### DayPlan

| Campo          | Tipo         | Descrição                                           |
| -------------- | ------------ | --------------------------------------------------- |
| `id`           | `UUID`       | ID primário                                          |
| `weeklyPlanId` | `UUID`       | FK → WeeklyPlan                                     |
| `dayOfWeek`    | `String`     | Dia da semana (MONDAY, TUESDAY, ..., SUNDAY)        |
| `name`         | `String`     | Nome do treino do dia (ex: "Peito e Tríceps")       |
| `exercises`    | `Exercise[]` | Lista de exercícios                                  |

### Exercise

| Campo        | Tipo      | Descrição                                  |
| ------------ | --------- | ------------------------------------------ |
| `id`         | `UUID`    | ID primário                                 |
| `dayPlanId`  | `UUID`    | FK → DayPlan                               |
| `name`       | `String`  | Nome do exercício (ex: "Supino Reto")       |
| `sets`       | `Int`     | Número de séries                            |
| `reps`       | `Int`     | Número de repetições                        |
| `loadKg`     | `Float?`  | Carga em kg (opcional)                      |
| `restSeconds`| `Int?`    | Descanso em segundos (opcional)             |
| `notes`      | `String?` | Observações do professor (opcional)         |
| `order`      | `Int`     | Ordem do exercício no dia                   |

### WorkoutCompletion

| Campo       | Tipo       | Descrição                                       |
| ----------- | ---------- | ----------------------------------------------- |
| `id`        | `UUID`     | ID primário                                      |
| `studentId` | `UUID`     | FK → User (aluno)                               |
| `dayPlanId` | `UUID`     | FK → DayPlan                                    |
| `date`      | `DateTime` | Data em que o treino foi completado              |

> **Constraint:** `@@unique([studentId, dayPlanId, date])` — Um aluno não pode marcar o mesmo treino como completo mais de uma vez no mesmo dia.

### Meal

| Campo       | Tipo         | Descrição                                    |
| ----------- | ------------ | -------------------------------------------- |
| `id`        | `UUID`       | ID primário                                   |
| `studentId` | `UUID`       | FK → User (aluno)                            |
| `type`      | `String`     | Tipo da refeição: `BREAKFAST`, `LUNCH`, `SNACK`, `DINNER` |
| `date`      | `DateTime`   | Data da refeição                              |
| `items`     | `MealItem[]` | Lista de itens alimentares                    |

> **Constraint:** `@@unique([studentId, type, date])` — Um aluno não pode ter duas refeições do mesmo tipo no mesmo dia.

### MealItem

| Campo      | Tipo     | Descrição                            |
| ---------- | -------- | ------------------------------------ |
| `id`       | `UUID`   | ID primário                           |
| `mealId`   | `UUID`   | FK → Meal                            |
| `name`     | `String` | Nome do alimento                      |
| `quantity` | `Float`  | Quantidade                            |
| `unit`     | `String` | Unidade de medida (g, ml, unidade...) |
| `calories` | `Float?` | Calorias (opcional)                   |
| `protein`  | `Float?` | Proteína em gramas (opcional)         |
| `carbs`    | `Float?` | Carboidratos em gramas (opcional)     |
| `fat`      | `Float?` | Gordura em gramas (opcional)          |

### PushToken

| Campo     | Tipo       | Descrição                              |
| --------- | ---------- | -------------------------------------- |
| `id`      | `UUID`     | ID primário                             |
| `userId`  | `UUID`     | FK → User                              |
| `token`   | `String`   | Expo Push Token (unique)                |
| `createdAt`| `DateTime`| Data de registro                        |

---

## Endpoints

### Health Check

#### `GET /health`

Verifica se o servidor está online.

- **Autenticação:** ❌ Não requerida
- **Response 200:**

```json
{
  "status": "ok"
}
```

---

### Auth — Autenticação

> **Prefixo:** `/api/auth`
> **Autenticação:** ❌ Não requerida (rotas públicas)

---

#### `POST /api/auth/register`

Cadastra um novo usuário (professor ou aluno) no Supabase Auth e no banco de dados local.

**Request Body:**

| Campo      | Tipo     | Obrigatório | Validação               | Exemplo                          |
| ---------- | -------- | ----------- | ----------------------- | -------------------------------- |
| `email`    | `string` | ✅          | E-mail válido            | `"aluno@email.com"`              |
| `password` | `string` | ✅          | Mínimo 6 caracteres      | `"senha123"`                     |
| `name`     | `string` | ✅          | Mínimo 2 caracteres      | `"João Silva"`                   |
| `birthDate`| `string` | ✅          | Data válida (ISO 8601)   | `"1995-10-25T00:00:00.000Z"`    |
| `role`     | `string` | ✅          | `"PROFESSOR"` ou `"ALUNO"` | `"ALUNO"`                      |
| `phone`    | `string` | ❌          | —                        | `"11999999999"`                  |
| `avatarUrl`| `string` | ❌          | URL válida               | `"https://example.com/avatar.jpg"` |

**Exemplo de Request:**

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

**Response 200:**

```json
{
  "user": {
    "id": "uuid-local-do-usuario",
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

> **Nota:** Se a confirmação de e-mail estiver ativada no Supabase, `session` será `null` até o usuário confirmar o e-mail.

**Erros possíveis:**

| Status | Code                 | Descrição                          |
| ------ | -------------------- | ---------------------------------- |
| `400`  | `USER_ALREADY_EXISTS`| E-mail já cadastrado               |
| `400`  | `REGISTRATION_FAILED`| Erro no cadastro do Supabase       |
| `400`  | Validation Error     | Campos inválidos (Zod)             |
| `500`  | `DATABASE_ERROR`     | Erro ao salvar no banco local      |

---

#### `POST /api/auth/login`

Autentica um usuário existente e retorna os tokens JWT.

**Request Body:**

| Campo      | Tipo     | Obrigatório | Validação              | Exemplo           |
| ---------- | -------- | ----------- | ---------------------- | ----------------- |
| `email`    | `string` | ✅          | E-mail válido           | `"aluno@email.com"` |
| `password` | `string` | ✅          | Mínimo 6 caracteres     | `"senha123"`       |

**Exemplo de Request:**

```json
{
  "email": "aluno@email.com",
  "password": "senha123"
}
```

**Response 200:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "refresh-token-value"
}
```

**Erros possíveis:**

| Status | Code          | Descrição                               |
| ------ | ------------- | --------------------------------------- |
| `400`  | Validation    | Campos inválidos                        |
| `401`  | `AUTH_FAILED` | Credenciais inválidas ou e-mail não confirmado |

---

### Enrollment — Vínculo Professor ↔ Aluno

> **Prefixo:** `/api/enrollment`
> **Autenticação:** ✅ Requerida (`Authorization: Bearer <token>`)

---

#### `POST /api/enrollment/invite`

Professor gera um código de convite de 6 caracteres (hexadecimal) válido por 48 horas.

- **Role permitida:** `PROFESSOR` apenas

**Request Body:** Nenhum (vazio)

**Response 200:**

```json
{
  "id": "uuid-do-convite",
  "code": "A1B2C3",
  "professorId": "uuid-do-professor",
  "expiresAt": "2026-05-24T17:43:00.000Z",
  "createdAt": "2026-05-22T17:43:00.000Z"
}
```

**Erros possíveis:**

| Status | Code        | Descrição                         |
| ------ | ----------- | --------------------------------- |
| `401`  | `UNAUTHORIZED` | Token ausente ou inválido      |
| `403`  | `FORBIDDEN` | Apenas professores podem gerar convites |

---

#### `POST /api/enrollment/join`

Aluno usa um código de convite para se vincular a um professor.

- **Role permitida:** `ALUNO` apenas

**Request Body:**

| Campo  | Tipo     | Obrigatório | Validação            | Exemplo    |
| ------ | -------- | ----------- | -------------------- | ---------- |
| `code` | `string` | ✅          | Exatamente 6 caracteres | `"A1B2C3"` |

**Exemplo de Request:**

```json
{
  "code": "A1B2C3"
}
```

**Response 200:**

```json
{
  "id": "uuid-do-enrollment",
  "professorId": "uuid-do-professor",
  "studentId": "uuid-do-aluno",
  "inviteCodeId": "uuid-do-convite",
  "active": true,
  "createdAt": "2026-05-22T17:45:00.000Z"
}
```

**Erros possíveis:**

| Status | Code               | Descrição                           |
| ------ | ------------------ | ----------------------------------- |
| `400`  | `INVALID_CODE`     | Código inválido ou expirado         |
| `403`  | `FORBIDDEN`        | Apenas alunos podem usar convites   |
| `409`  | `ALREADY_ENROLLED` | Aluno já vinculado a este professor |

---

#### `GET /api/enrollment/students`

Professor lista todos os alunos ativamente vinculados a ele.

- **Role recomendada:** `PROFESSOR`

**Query Parameters:** Nenhum

**Response 200:**

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

- **Role recomendada:** `ALUNO`

**Query Parameters:** Nenhum

**Response 200:**

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

> **Prefixo:** `/api/workouts`
> **Autenticação:** ✅ Requerida (`Authorization: Bearer <token>`)

---

#### `POST /api/workouts/plans`

Professor cria um plano semanal completo com dias e exercícios para um aluno.

- **Role permitida:** `PROFESSOR` apenas

**Request Body:**

| Campo       | Tipo     | Obrigatório | Descrição                              |
| ----------- | -------- | ----------- | -------------------------------------- |
| `studentId` | `string` | ✅          | UUID do aluno destinatário              |
| `name`      | `string` | ✅          | Nome do plano                           |
| `days`      | `array`  | ✅          | Lista de dias do plano (ver abaixo)     |

**Objeto `days[i]`:**

| Campo       | Tipo     | Obrigatório | Valores aceitos                                                        |
| ----------- | -------- | ----------- | ---------------------------------------------------------------------- |
| `dayOfWeek` | `string` | ✅          | `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` |
| `name`      | `string` | ✅          | Nome do treino do dia                                                   |
| `exercises` | `array`  | ✅          | Lista de exercícios (ver abaixo)                                        |

**Objeto `days[i].exercises[j]`:**

| Campo        | Tipo      | Obrigatório | Descrição                     |
| ------------ | --------- | ----------- | ----------------------------- |
| `name`       | `string`  | ✅          | Nome do exercício              |
| `sets`       | `integer` | ✅          | Número de séries (≥ 1)         |
| `reps`       | `integer` | ✅          | Número de repetições (≥ 1)     |
| `order`      | `integer` | ✅          | Ordem do exercício no dia (≥ 0)|
| `loadKg`     | `number`  | ❌          | Carga em kg                    |
| `restSeconds`| `integer` | ❌          | Descanso em segundos           |
| `notes`      | `string`  | ❌          | Observações                    |

**Exemplo de Request:**

```json
{
  "studentId": "uuid-do-aluno",
  "name": "Hipertrofia - Semana 1",
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "name": "Peito e Tríceps",
      "exercises": [
        {
          "name": "Supino Reto",
          "sets": 4,
          "reps": 10,
          "loadKg": 60,
          "restSeconds": 60,
          "notes": "Focar na cadência",
          "order": 0
        },
        {
          "name": "Tríceps Pulley",
          "sets": 3,
          "reps": 12,
          "loadKg": 25,
          "restSeconds": 45,
          "order": 1
        }
      ]
    }
  ]
}
```

**Response 200:**

```json
{
  "id": "uuid-do-plano",
  "name": "Hipertrofia - Semana 1",
  "professorId": "uuid-do-professor",
  "studentId": "uuid-do-aluno",
  "active": true,
  "days": [
    {
      "id": "uuid-do-day-plan",
      "dayOfWeek": "MONDAY",
      "name": "Peito e Tríceps",
      "exercises": [
        {
          "id": "uuid-do-exercicio",
          "name": "Supino Reto",
          "sets": 4,
          "reps": 10,
          "loadKg": 60,
          "restSeconds": 60,
          "notes": "Focar na cadência",
          "order": 0
        }
      ]
    }
  ]
}
```

**Erros possíveis:**

| Status | Code        | Descrição                            |
| ------ | ----------- | ------------------------------------ |
| `403`  | `FORBIDDEN` | Apenas professores podem criar planos |

---

#### `GET /api/workouts/today`

Retorna o treino do dia atual (baseado no dia da semana) para o aluno autenticado.

- **Quem usa:** Qualquer usuário autenticado (útil para `ALUNO`)

**Response 200 (com treino):**

```json
{
  "id": "uuid-do-day-plan",
  "dayOfWeek": "MONDAY",
  "name": "Peito e Tríceps",
  "exercises": [
    {
      "id": "uuid-do-exercicio",
      "name": "Supino Reto",
      "sets": 4,
      "reps": 10,
      "loadKg": 60,
      "restSeconds": 60,
      "notes": "Focar na cadência",
      "order": 0
    }
  ]
}
```

**Response 200 (sem treino hoje):**

```json
{
  "message": "No workout today"
}
```

---

#### `POST /api/workouts/complete`

Aluno marca um dia de treino (DayPlan) como completo em uma data específica.

- **Role permitida:** `ALUNO` apenas

**Request Body:**

| Campo       | Tipo     | Obrigatório | Descrição                              |
| ----------- | -------- | ----------- | -------------------------------------- |
| `dayPlanId` | `string` | ✅          | UUID do DayPlan a ser marcado           |
| `date`      | `string` | ✅          | Data/hora ISO 8601 da conclusão         |

**Exemplo de Request:**

```json
{
  "dayPlanId": "uuid-do-day-plan",
  "date": "2026-05-22T18:30:00.000Z"
}
```

**Response 200:**

```json
{
  "id": "uuid-da-completion",
  "studentId": "uuid-do-aluno",
  "dayPlanId": "uuid-do-day-plan",
  "date": "2026-05-22T18:30:00.000Z"
}
```

**Erros possíveis:**

| Status | Code                | Descrição                                |
| ------ | ------------------- | ---------------------------------------- |
| `403`  | `FORBIDDEN`         | Apenas alunos podem marcar treinos       |
| `409`  | `ALREADY_COMPLETED` | Treino já foi marcado como completo hoje |

---

### Nutrition — Nutrição e Refeições

> **Prefixo:** `/api/nutrition`
> **Autenticação:** ✅ Requerida (`Authorization: Bearer <token>`)

---

#### `POST /api/nutrition/meals`

Aluno registra uma refeição com itens alimentares e informações nutricionais.

- **Role permitida:** `ALUNO` apenas

**Request Body:**

| Campo   | Tipo     | Obrigatório | Valores aceitos                            |
| ------- | -------- | ----------- | ------------------------------------------ |
| `type`  | `string` | ✅          | `BREAKFAST`, `LUNCH`, `SNACK`, `DINNER`     |
| `date`  | `string` | ✅          | Data/hora ISO 8601                          |
| `items` | `array`  | ✅          | Lista de itens alimentares (ver abaixo)     |

**Objeto `items[i]`:**

| Campo      | Tipo     | Obrigatório | Descrição                    |
| ---------- | -------- | ----------- | ---------------------------- |
| `name`     | `string` | ✅          | Nome do alimento              |
| `quantity` | `number` | ✅          | Quantidade (> 0)              |
| `unit`     | `string` | ✅          | Unidade (g, ml, unidade, etc.)|
| `calories` | `number` | ❌          | Calorias                      |
| `protein`  | `number` | ❌          | Proteína (g)                  |
| `carbs`    | `number` | ❌          | Carboidratos (g)              |
| `fat`      | `number` | ❌          | Gordura (g)                   |

**Exemplo de Request:**

```json
{
  "type": "LUNCH",
  "date": "2026-05-22T12:30:00.000Z",
  "items": [
    {
      "name": "Arroz Integral",
      "quantity": 150,
      "unit": "g",
      "calories": 180,
      "protein": 4,
      "carbs": 38,
      "fat": 1
    },
    {
      "name": "Peito de Frango Grelhado",
      "quantity": 120,
      "unit": "g",
      "calories": 198,
      "protein": 37,
      "carbs": 0,
      "fat": 4.5
    }
  ]
}
```

**Response 200:**

```json
{
  "id": "uuid-da-refeicao",
  "studentId": "uuid-do-aluno",
  "type": "LUNCH",
  "date": "2026-05-22T12:30:00.000Z",
  "items": [
    {
      "id": "uuid-do-item",
      "mealId": "uuid-da-refeicao",
      "name": "Arroz Integral",
      "quantity": 150,
      "unit": "g",
      "calories": 180,
      "protein": 4,
      "carbs": 38,
      "fat": 1
    }
  ]
}
```

**Erros possíveis:**

| Status | Code            | Descrição                                           |
| ------ | --------------- | --------------------------------------------------- |
| `403`  | `FORBIDDEN`     | Apenas alunos podem registrar refeições             |
| `409`  | `ALREADY_EXISTS`| Refeição duplicada (mesmo tipo + mesmo dia + mesmo aluno)|

---

#### `GET /api/nutrition/meals`

Lista todas as refeições do aluno autenticado em uma data específica.

**Query Parameters:**

| Param  | Tipo     | Obrigatório | Formato      | Exemplo       |
| ------ | -------- | ----------- | ------------ | ------------- |
| `date` | `string` | ✅          | `YYYY-MM-DD` | `2026-05-22`  |

**Exemplo:** `GET /api/nutrition/meals?date=2026-05-22`

**Response 200:**

```json
[
  {
    "id": "uuid-da-refeicao",
    "type": "LUNCH",
    "date": "2026-05-22T12:30:00.000Z",
    "items": [
      {
        "id": "uuid-do-item",
        "name": "Arroz Integral",
        "quantity": 150,
        "unit": "g",
        "calories": 180,
        "protein": 4,
        "carbs": 38,
        "fat": 1
      }
    ]
  }
]
```

**Erros possíveis:**

| Status | Code           | Descrição                    |
| ------ | -------------- | ---------------------------- |
| `400`  | `MISSING_DATE` | Parâmetro `date` não enviado |

---

#### `DELETE /api/nutrition/meals/:id`

Remove uma refeição registrada. Somente o dono (aluno que criou) pode deletar.

**Path Parameters:**

| Param | Tipo     | Descrição                |
| ----- | -------- | ------------------------ |
| `id`  | `string` | UUID da refeição a deletar |

**Response 200:**

```json
{
  "success": true
}
```

**Erros possíveis:**

| Status | Code        | Descrição                            |
| ------ | ----------- | ------------------------------------ |
| `403`  | `FORBIDDEN` | Refeição pertence a outro usuário    |
| `404`  | `NOT_FOUND` | Refeição não encontrada              |

---

#### `GET /api/nutrition/search`

Busca alimentos na API externa **Open Food Facts**. Retorna até 10 resultados com informações nutricionais por 100g.

**Query Parameters:**

| Param | Tipo     | Obrigatório | Descrição      | Exemplo  |
| ----- | -------- | ----------- | -------------- | -------- |
| `q`   | `string` | ✅          | Termo de busca | `"Arroz"` |

**Exemplo:** `GET /api/nutrition/search?q=banana`

**Response 200:**

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

**Erros possíveis:**

| Status | Code            | Descrição                     |
| ------ | --------------- | ----------------------------- |
| `400`  | `MISSING_QUERY` | Parâmetro `q` não enviado     |
| `502`  | `API_ERROR`     | Falha ao consultar Open Food Facts |

---

### Settings — Configurações e Notificações

> **Prefixo:** `/api/settings`
> **Autenticação:** ✅ Requerida (`Authorization: Bearer <token>`)

---

#### `POST /api/settings/push-token`

Salva ou atualiza o Expo Push Token do dispositivo do usuário para envio de notificações push.

**Request Body:**

| Campo   | Tipo     | Obrigatório | Descrição                     | Exemplo                                    |
| ------- | -------- | ----------- | ----------------------------- | ------------------------------------------ |
| `token` | `string` | ✅          | Expo Push Token (mín 1 char)  | `"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"` |

**Exemplo de Request:**

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response 200:**

```json
{
  "success": true
}
```

> Se o token já existir no banco, ele atualiza o `userId` associado (upsert). Isso permite que um dispositivo troque de conta.

---

## Códigos de Erro

Todos os erros seguem o formato padrão:

```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "error": "Unauthorized",
  "message": "No authorization header"
}
```

### Tabela de Erros Globais

| Status | Code               | Descrição                                              |
| ------ | ------------------ | ------------------------------------------------------ |
| `400`  | Validation Error   | Campos do body inválidos (Zod)                          |
| `401`  | `UNAUTHORIZED`     | Token ausente, inválido, ou usuário não encontrado no DB |
| `403`  | `FORBIDDEN`        | Usuário não tem a role necessária para a ação            |
| `404`  | `NOT_FOUND`        | Recurso não encontrado                                  |
| `409`  | Conflito           | Recurso duplicado (enrollment, workout completion, meal) |
| `500`  | `DATABASE_ERROR`   | Erro interno do banco de dados                           |
| `502`  | `API_ERROR`        | Erro ao consultar API externa                           |

---

## Variáveis de Ambiente

| Variável            | Obrigatória | Descrição                                       | Exemplo                                      |
| ------------------- | ----------- | ----------------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`      | ✅          | Connection string do PostgreSQL (Prisma)          | `postgresql://user:pass@host:5432/dbname`     |
| `SUPABASE_URL`      | ✅          | URL base do projeto Supabase                      | `https://xxxxx.supabase.co`                   |
| `SUPABASE_ANON_KEY` | ✅          | Chave anon/public do projeto Supabase             | `eyJhbGciOiJIUzI1...`                        |
| `PORT`              | ❌          | Porta do servidor (default: `3333`)               | `3333`                                        |

---

## Fluxo Completo do Frontend

O diagrama abaixo resume a ordem em que o frontend deve chamar as rotas para implementar o fluxo principal do app:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DO APLICATIVO                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ONBOARDING                                                          │
│     POST /api/auth/register  →  Escolhe PROFESSOR ou ALUNO              │
│     POST /api/auth/login     →  Recebe access_token                     │
│                                                                         │
│  2. VINCULAÇÃO (após login)                                             │
│     ┌── PROFESSOR ──────────────────────┐                               │
│     │ POST /api/enrollment/invite       │ ← Gera código de 6 chars      │
│     │ GET  /api/enrollment/students     │ ← Lista seus alunos           │
│     └───────────────────────────────────┘                               │
│     ┌── ALUNO ──────────────────────────┐                               │
│     │ POST /api/enrollment/join         │ ← Insere código do professor  │
│     │ GET  /api/enrollment/professor    │ ← Vê seu professor            │
│     └───────────────────────────────────┘                               │
│                                                                         │
│  3. TREINOS                                                             │
│     ┌── PROFESSOR ──────────────────────┐                               │
│     │ POST /api/workouts/plans          │ ← Cria plano semanal          │
│     └───────────────────────────────────┘                               │
│     ┌── ALUNO ──────────────────────────┐                               │
│     │ GET  /api/workouts/today          │ ← Vê treino do dia            │
│     │ POST /api/workouts/complete       │ ← Marca treino como feito     │
│     └───────────────────────────────────┘                               │
│                                                                         │
│  4. NUTRIÇÃO (ALUNO)                                                    │
│     GET  /api/nutrition/search?q=...    → Busca alimentos               │
│     POST /api/nutrition/meals           → Registra refeição             │
│     GET  /api/nutrition/meals?date=...  → Lista refeições do dia        │
│     DELETE /api/nutrition/meals/:id     → Remove refeição               │
│                                                                         │
│  5. NOTIFICAÇÕES (ambos)                                                │
│     POST /api/settings/push-token       → Registra token Expo Push      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

> **Gerado automaticamente** em 22/05/2026 para o projeto Peaktime Backend v1.0.0

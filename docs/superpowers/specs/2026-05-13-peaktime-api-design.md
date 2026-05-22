# Peaktime API — Design Spec

**App:** Aplicativo de academia mobile (React Native + Expo)
**Backend:** Fastify + TypeScript + Prisma + PostgreSQL (Supabase)
**Auth:** Supabase Auth
**Push:** Expo Push Notifications
**Metodologia:** TDD (Test-Driven Development)

---

## Visão Geral

API REST para app de academia com dois perfis: **PROFESSOR** e **ALUNO**.

- Professor cria planos semanais de treino pra alunos via código de convite
- Aluno executa treinos, marca como feito, registra alimentação diária
- Sistema envia notificações push (lembretes, alterações, cobranças)
- Ambos configuram perfil, preferências e metas

---

## Arquitetura

Fastify plugins por domínio. Cada plugin encapsula rotas, schemas e lógica de negócio.

```
src/
├── app.ts                    # Fastify app, registra plugins
├── server.ts                 # Bootstrap
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── prisma.ts             # Prisma client singleton
│   └── errors.ts             # Error handlers padronizados
├── middleware/
│   ├── authenticate.ts       # Verifica JWT Supabase
│   └── authorize.ts          # Checa role (PROFESSOR/ALUNO)
├── plugins/
│   ├── auth/
│   │   ├── auth.plugin.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts
│   ├── enrollment/
│   │   ├── enrollment.plugin.ts
│   │   ├── enrollment.routes.ts
│   │   ├── enrollment.service.ts
│   │   └── enrollment.schema.ts
│   ├── workouts/
│   │   ├── workouts.plugin.ts
│   │   ├── workouts.routes.ts
│   │   ├── workouts.service.ts
│   │   └── workouts.schema.ts
│   ├── nutrition/
│   │   ├── nutrition.plugin.ts
│   │   ├── nutrition.routes.ts
│   │   ├── nutrition.service.ts
│   │   └── nutrition.schema.ts
│   ├── settings/
│   │   ├── settings.plugin.ts
│   │   ├── settings.routes.ts
│   │   ├── settings.service.ts
│   │   └── settings.schema.ts
│   └── notifications/
│       ├── notifications.plugin.ts
│       ├── notifications.service.ts
│       └── notifications.scheduler.ts
└── tests/
    ├── helpers/
    │   ├── setup.ts              # Test app builder
    │   └── fixtures.ts           # Factory functions
    ├── plugins/auth/
    ├── plugins/enrollment/
    ├── plugins/workouts/
    ├── plugins/nutrition/
    ├── plugins/settings/
    └── plugins/notifications/
```

**Padrão por plugin:**
- `*.plugin.ts` — registra rotas no Fastify como plugin encapsulado
- `*.routes.ts` — definição de rotas com schemas de validação
- `*.service.ts` — lógica de negócio pura (testável isolado, recebe Prisma por DI)
- `*.schema.ts` — validação com Zod, gera Fastify JSON Schemas

**Test framework:** Vitest (rápido, ESM nativo, compatível com stack)

---

## Database Schema (Prisma)

### User
```prisma
model User {
  id            String   @id @default(uuid())
  supabaseId    String   @unique
  name          String
  email         String   @unique
  phone         String?
  birthDate     DateTime
  avatarUrl     String?
  role          Role     @default(ALUNO)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  settings        UserSettings?
  pushTokens      PushToken[]
  inviteCodes     InviteCode[]      @relation("ProfessorCodes")
  students        Enrollment[]      @relation("ProfessorStudents")
  createdPlans    WeeklyPlan[]      @relation("PlanCreator")
  enrollments     Enrollment[]      @relation("StudentEnrollments")
  assignedPlans   WeeklyPlan[]      @relation("PlanStudent")
  completions     WorkoutCompletion[]
  meals           Meal[]
}

enum Role { PROFESSOR ALUNO }
```

### Enrollment (Vínculo Professor-Aluno)
```prisma
model InviteCode {
  id          String     @id @default(uuid())
  code        String     @unique   // 6 chars uppercase alfanumérico
  professorId String
  professor   User       @relation("ProfessorCodes", fields: [professorId], references: [id])
  usedBy      Enrollment?
  expiresAt   DateTime
  createdAt   DateTime   @default(now())
}

model Enrollment {
  id            String     @id @default(uuid())
  professorId   String
  studentId     String
  inviteCodeId  String     @unique
  professor     User       @relation("ProfessorStudents", fields: [professorId], references: [id])
  student       User       @relation("StudentEnrollments", fields: [studentId], references: [id])
  inviteCode    InviteCode @relation(fields: [inviteCodeId], references: [id])
  active        Boolean    @default(true)
  createdAt     DateTime   @default(now())

  @@unique([professorId, studentId])
}
```

### Workouts (Treinos)
```prisma
model WeeklyPlan {
  id          String    @id @default(uuid())
  name        String
  professorId String
  studentId   String
  professor   User      @relation("PlanCreator", fields: [professorId], references: [id])
  student     User      @relation("PlanStudent", fields: [studentId], references: [id])
  active      Boolean   @default(true)
  days        DayPlan[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model DayPlan {
  id           String     @id @default(uuid())
  weeklyPlanId String
  weeklyPlan   WeeklyPlan @relation(fields: [weeklyPlanId], references: [id], onDelete: Cascade)
  dayOfWeek    DayOfWeek
  name         String
  exercises    Exercise[]
  completions  WorkoutCompletion[]

  @@unique([weeklyPlanId, dayOfWeek])
}

model Exercise {
  id          String  @id @default(uuid())
  dayPlanId   String
  dayPlan     DayPlan @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)
  name        String
  sets        Int
  reps        Int
  loadKg      Float?
  restSeconds Int?
  notes       String?
  order       Int
}

model WorkoutCompletion {
  id          String   @id @default(uuid())
  studentId   String
  dayPlanId   String
  student     User     @relation(fields: [studentId], references: [id])
  dayPlan     DayPlan  @relation(fields: [dayPlanId], references: [id])
  completedAt DateTime @default(now())
  date        DateTime

  @@unique([studentId, dayPlanId, date])
}

enum DayOfWeek { MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY SATURDAY SUNDAY }
```

### Nutrition (Alimentação)
```prisma
model Meal {
  id        String   @id @default(uuid())
  studentId String
  student   User     @relation(fields: [studentId], references: [id])
  type      MealType
  date      DateTime
  items     MealItem[]
  createdAt DateTime @default(now())

  @@unique([studentId, type, date])
}

model MealItem {
  id       String @id @default(uuid())
  mealId   String
  meal     Meal   @relation(fields: [mealId], references: [id], onDelete: Cascade)
  name     String
  quantity Float
  unit     String
  calories Float?
  protein  Float?
  carbs    Float?
  fat      Float?
}

enum MealType { BREAKFAST LUNCH SNACK DINNER }
```

### Settings & Push
```prisma
model UserSettings {
  id                   String  @id @default(uuid())
  userId               String  @unique
  user                 User    @relation(fields: [userId], references: [id])
  notificationsEnabled Boolean @default(true)
  preferredTime        String?
  targetWeightKg       Float?
  dailyCalorieGoal     Int?
}

model PushToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  createdAt DateTime @default(now())
}
```

---

## API Endpoints

### Auth (`/api/auth`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/api/auth/register` | Cria user no Supabase + perfil Prisma | Público |
| POST | `/api/auth/login` | Login via Supabase, retorna JWT | Público |
| GET | `/api/auth/profile` | Perfil do user logado | Autenticado |
| PUT | `/api/auth/profile` | Atualiza perfil | Autenticado |

**Register body:** `{ name, email, password, phone?, birthDate, role }`
**Login body:** `{ email, password }`
**Profile response:** `{ id, name, email, phone, birthDate, avatarUrl, role }`

Fluxo auth:
1. Frontend chama `/register` → backend cria user no Supabase Auth + row no Prisma
2. Frontend chama `/login` → backend autentica no Supabase, retorna `access_token` + `refresh_token`
3. Frontend envia `Authorization: Bearer <access_token>` em todas requests autenticadas
4. Middleware `authenticate` verifica JWT com Supabase, injeta `request.user`

### Enrollment (`/api/enrollment`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/api/enrollment/invite` | Gera código convite (6 chars, expira 48h) | PROFESSOR |
| POST | `/api/enrollment/join` | Aluno usa código pra vincular | ALUNO |
| GET | `/api/enrollment/students` | Lista alunos do professor | PROFESSOR |
| GET | `/api/enrollment/professor` | Aluno vê seu professor | ALUNO |
| DELETE | `/api/enrollment/:id` | Desvincular | PROFESSOR ou ALUNO do enrollment |

**Invite body:** (nenhum — gera automático)
**Join body:** `{ code: "ABC123" }`

### Workouts (`/api/workouts`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/api/workouts/plans` | Cria plano semanal | PROFESSOR |
| GET | `/api/workouts/plans/:studentId` | Plano ativo do aluno | PROFESSOR (vinculado) ou próprio ALUNO |
| PUT | `/api/workouts/plans/:id` | Atualiza plano completo | PROFESSOR |
| DELETE | `/api/workouts/plans/:id` | Remove plano | PROFESSOR |
| GET | `/api/workouts/today` | Treino de hoje (aluno logado) | ALUNO |
| POST | `/api/workouts/complete` | Marca treino do dia feito | ALUNO |
| GET | `/api/workouts/history` | Histórico completions (query: last N days) | ALUNO |

**Create plan body:**
```json
{
  "name": "Hipertrofia Fase 1",
  "studentId": "uuid",
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "name": "Peito e Tríceps",
      "exercises": [
        { "name": "Supino Reto", "sets": 4, "reps": 12, "loadKg": 60, "restSeconds": 90, "notes": "Cotovelo 45°", "order": 1 }
      ]
    }
  ]
}
```

**Complete body:** `{ dayPlanId: "uuid", date: "2026-05-13" }`

### Nutrition (`/api/nutrition`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| POST | `/api/nutrition/meals` | Registra refeição com itens | ALUNO |
| GET | `/api/nutrition/meals?date=YYYY-MM-DD` | Refeições do dia | ALUNO |
| PUT | `/api/nutrition/meals/:id` | Edita refeição | ALUNO (dono) |
| DELETE | `/api/nutrition/meals/:id` | Remove refeição | ALUNO (dono) |
| GET | `/api/nutrition/search?q=arroz` | Busca alimento na API nutrição externa | Autenticado |
| GET | `/api/nutrition/summary?date=YYYY-MM-DD` | Total macros/calorias do dia | ALUNO |

**API nutrição externa:** [Open Food Facts](https://world.openfoodfacts.org/data) — gratuita, sem API key.

**Create meal body:**
```json
{
  "type": "LUNCH",
  "date": "2026-05-13",
  "items": [
    { "name": "Arroz branco", "quantity": 150, "unit": "g", "calories": 195, "protein": 3.5, "carbs": 43, "fat": 0.4 }
  ]
}
```

### Settings (`/api/settings`)

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| GET | `/api/settings` | Config do user logado | Autenticado |
| PUT | `/api/settings` | Atualiza config | Autenticado |
| POST | `/api/settings/push-token` | Registra Expo push token | Autenticado |
| DELETE | `/api/settings/push-token/:token` | Remove push token | Autenticado |

### Notifications (interno)

Sem rotas públicas. Scheduler interno (via `setInterval` ou lib como `node-cron`):

| Trigger | Quando | Mensagem |
|---------|--------|----------|
| Lembrete treino | `preferredTime` do aluno | "Hora do treino! Seu treino de {dayName} está esperando 💪" |
| Lembrete alimentação | 12:00, 19:00 | "Não esqueça de registrar sua refeição 🍽️" |
| Treino alterado | Professor cria/altera plano | "Seu professor atualizou seu treino! Confira 📋" |
| Treino não feito | 21:00 se não completou | "Ainda dá tempo! Seu treino de hoje não foi registrado 🏋️" |

---

## Error Handling

Padrão de resposta de erro:
```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Descrição legível do erro"
}
```

Códigos HTTP:
- `400` — Validação falhou
- `401` — Não autenticado
- `403` — Sem permissão (role errado ou não é dono)
- `404` — Recurso não encontrado
- `409` — Conflito (ex: aluno já vinculado, treino já marcado)

---

## Sub-Projetos (Ordem de Build)

Cada sub-projeto segue ciclo completo: spec → plan → TDD → implement.

1. **Infra + Auth** — Setup Vitest, Supabase Auth, middleware, Prisma schema
2. **Enrollment** — Código convite, vínculo professor-aluno
3. **Workouts** — CRUD plano semanal, tracking completions
4. **Nutrition** — Refeições, integração Open Food Facts
5. **Settings + Notifications** — Config, metas, push tokens, scheduler

---

## Decisões Técnicas

- **Zod** pra validação de schemas (type-safe, integra com Fastify)
- **Dependency Injection** nos services (recebem PrismaClient como param → testável sem mock pesado)
- **Vitest** como test runner (ESM nativo, rápido, API similar Jest)
- **Open Food Facts API** pra dados nutricionais (gratuita, sem key)
- **node-cron** pra scheduler de notificações
- **expo-server-sdk** pra enviar push notifications

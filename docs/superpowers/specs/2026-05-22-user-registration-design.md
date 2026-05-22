# Especificação Técnica: Registro de Usuários (Peaktime Backend)

Esta especificação define a implementação do cadastro de usuários sincronizado com o Supabase Auth e o banco de dados PostgreSQL via Prisma.

## 1. Escopo e Objetivos

- Disponibilizar uma rota pública `POST /api/auth/register` para cadastro de novos usuários.
- Permitir ao usuário escolher seu papel (`PROFESSOR` ou `ALUNO`) durante o cadastro.
- Sincronizar o cadastro do usuário no Supabase Auth com o banco de dados local.
- Atualizar o middleware de autenticação (`authenticate.ts`) para resolver o usuário do banco local usando o `supabaseId`, garantindo que `request.user` contenha as propriedades do banco de dados (especialmente o `id` interno e a `role`).

## 2. Fluxo de Dados e Arquitetura

O fluxo completo da requisição de cadastro é:

1. **Validação da Requisição:** Validação do payload recebido através do schema Zod (`registerSchema`).
2. **Verificação de Email Existente:** Consulta na tabela local `User` pelo email informado. Caso exista, retorna `400 Bad Request` com o código `USER_ALREADY_EXISTS`.
3. **Criação no Supabase Auth:** Envio das credenciais ao Supabase Auth via `supabase.auth.signUp({ email, password })`. Em caso de erro do Supabase, retorna `400 Bad Request` com o erro do provedor.
4. **Criação no Banco Local:** Persistência dos dados cadastrais (`name`, `email`, `phone`, `birthDate`, `avatarUrl`, `role`) na tabela `User` do banco de dados, associando o ID gerado pelo Supabase ao campo `supabaseId`.
5. **Retorno de Sessão (Opcional):** Se o cadastro no Supabase retornar uma sessão ativa (auto-confirmação ativa), retorna os tokens `access_token` e `refresh_token` junto com as informações públicas do usuário criado. Caso contrário, retorna os dados do usuário informando sucesso.

## 3. Detalhes das Alterações

### 3.1. Novo Schema de Validação (`src/plugins/auth/auth.schema.ts`)
Adição de `registerSchema`:
```typescript
import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  birthDate: z.string().datetime(), // ISO 8601 string
  avatarUrl: z.string().url().optional(),
  role: z.enum(['PROFESSOR', 'ALUNO']),
});
```

### 3.2. Serviço de Autenticação (`src/plugins/auth/auth.service.ts`)
Adição do método `register` no objeto `AuthService`:
- Verifica existência do email localmente.
- Invoca `supabase.auth.signUp`.
- Cria o usuário no banco via `prisma.user.create`.
- Formata a resposta com dados do usuário e tokens de sessão (se disponíveis).

### 3.3. Rotas de Autenticação (`src/plugins/auth/auth.routes.ts`)
Adição do endpoint `POST /register` no Fastify:
- Valida corpo com `registerSchema`.
- Chama `AuthService.register`.
- Envia resposta de sucesso ou erro (tratando `ZodError` e `AppError`).

### 3.4. Middleware de Autenticação (`src/middleware/authenticate.ts`)
Alteração para consultar o banco local:
```typescript
import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { supabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export const authenticate = async (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError(401, 'UNAUTHORIZED', 'No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  }

  // Busca o usuário local associado ao supabaseId
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id }
  });

  if (!dbUser) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not synced in local database');
  }

  (request as any).user = dbUser;
};
```

## 4. Plano de Testes

### 4.1. Testes Unitários
- **`auth.service.test.ts`**:
  - Testar cadastro com sucesso (mockando Supabase e Prisma).
  - Testar erro quando o email já existe no banco local.
  - Testar erro quando o Supabase Auth falha no cadastro.
- **`auth.routes.test.ts`**:
  - Testar chamada `POST /api/auth/register` retornando status 200/201 em caso de sucesso.
  - Testar chamada com payload inválido retornando erro 400.
- **`authenticate.test.ts`**:
  - Testar comportamento quando o usuário não é encontrado no banco local (retornando erro 401).

### 4.2. Execução de Testes Automatizados
```bash
npm run test
```

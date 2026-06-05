# Especificação de Design — API de Ocupação

Esta especificação descreve a implementação completa e padronizada da API de Ocupação da academia no Peaktime Backend, seguindo as diretrizes de documentação OpenAPI/Swagger e cobertura de testes.

## Objetivos e Requisitos

1. **Correção do Prefixo:** Assegurar que as rotas da API de ocupação fiquem sob o prefixo `/api/occupancy` (em vez de `/occupancy`).
2. **Documentação Swagger (OpenAPI):** Adicionar esquemas de entrada/saída detalhados para todos os endpoints da API de Ocupação para visualização interativa em `/docs`.
3. **Cobertura de Testes:**
   - Testes unitários para o `OccupancyService` cobrindo o cálculo de lotação (`percentage` e `level`), o histórico do dia, a simulação e agregação da previsão (`forecast`) e a criação de registros.
   - Testes de integração para as rotas em `occupancy.routes.ts` usando `supertest` e mockando o serviço.

## Arquitetura e Fluxo de Dados

A API de ocupação lê e grava registros na tabela `OccupancyReading` do banco de dados (gerenciado pelo Prisma).

```
   [Sensor IoT / Admin] ────> POST /api/occupancy/readings ──> Prisma (OccupancyReading)
   [Frontend Client]    ────> GET /api/occupancy/current   ──> Última leitura + Cálculo de Nível
   [Frontend Client]    ────> GET /api/occupancy/history   ──> Leituras do dia
   [Frontend Client]    ────> GET /api/occupancy/forecast  ──> Previsão baseada nas últimas 4 semanas
```

### Níveis de Ocupação e Cores de Referência
- `EMPTY`: 0% – 15%
- `QUIET`: 16% – 35%
- `MODERATE`: 36% – 60%
- `BUSY`: 61% – 85%
- `FULL`: 86% – 100%

---

## Modificações Propostas

### 1. Prefixo do Plugin
**Arquivo:** `src/plugins/occupancy/occupancy.plugin.ts`
- Alterar o prefixo de `/occupancy` para `/api/occupancy`.

### 2. Especificação do Swagger nas Rotas
**Arquivo:** `src/plugins/occupancy/occupancy.routes.ts`
Adicionar os esquemas de validação do Fastify para cada endpoint com descrições em português (para manter a consistência com o restante do projeto):

- **`GET /current`**
  - **Tags:** `['Occupancy']`
  - **Summary:** `Obter ocupação em tempo real`
  - **Description:** `Retorna a leitura de ocupação mais recente da academia com o nível calculado.`
  - **Resposta 200:** Objeto com `id`, `count`, `capacity`, `timestamp`, `percentage`, `level`.

- **`GET /history`**
  - **Tags:** `['Occupancy']`
  - **Summary:** `Obter histórico de ocupação do dia`
  - **Querystring:** Parâmetro opcional `date` (formato `YYYY-MM-DD`).
  - **Resposta 200:** Objeto contendo `date`, `capacity` e array `readings` (com `hour`, `minute`, `count`).

- **`GET /forecast`**
  - **Tags:** `['Occupancy']`
  - **Summary:** `Obter previsão de ocupação`
  - **Description:** `Retorna a previsão hora a hora para o restante do dia baseada no histórico das últimas 4 semanas.`
  - **Resposta 200:** Objeto contendo `dayOfWeek`, `capacity` e array `forecast` (com `hour`, `avgCount`, `percentage`, `level`).

- **`POST /readings`**
  - **Tags:** `['Occupancy']`
  - **Summary:** `Registrar nova leitura de ocupação`
  - **Body:** `{ count: number, capacity: number }`
  - **Resposta 201:** Objeto da leitura criada.

---

## Plano de Testes

### 1. Testes de Serviço
**Arquivo:** `tests/plugins/occupancy/occupancy.service.test.ts`
- **Caso 1:** `getCurrentOccupancy` deve retornar a leitura mais recente com a porcentagem e nível corretos.
- **Caso 2:** `getCurrentOccupancy` sem leituras deve retornar o estado padrão (`no-data`, `0`, `100`, `EMPTY`).
- **Caso 3:** `getDayHistory` deve retornar a lista de leituras formatadas no intervalo do dia especificado.
- **Caso 4:** `getForecast` com dados históricos deve agregar e calcular as médias corretas para as horas restantes do dia atual.
- **Caso 5:** `getForecast` sem dados históricos deve retornar a simulação baseada na hora do dia.
- **Caso 6:** `createReading` deve inserir corretamente uma nova leitura e retornar a resposta formatada.

### 2. Testes de Rotas
**Arquivo:** `tests/plugins/occupancy/occupancy.routes.test.ts`
- **Caso 1:** `GET /api/occupancy/current` retorna status `200` e chama o serviço corretamente.
- **Caso 2:** `GET /api/occupancy/history` retorna status `200` e repassa o parâmetro de data ao serviço.
- **Caso 3:** `GET /api/occupancy/forecast` retorna status `200` e traz a lista de previsões.
- **Caso 4:** `POST /api/occupancy/readings` cria leitura com sucesso e retorna `201`.
- **Caso 5:** `POST /api/occupancy/readings` com payload inválido (por exemplo, count negativo ou capacity zero) retorna `400 Bad Request`.

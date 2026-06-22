# KulipaPay — Roadmap de Execução

> Documento vivo. Última revisão: Junho 2026  
> Baseado no plano arquitectural do sistema e auditoria do código actual.

---

## Estado actual (baseline)

| Dimensão | % estimado | Notas |
|----------|------------|-------|
| Código backend (motores + módulos) | ~65–70% | Policy, escrow, ledger, v2 existem no código |
| API activa em produção (`app.js`) | ~40–45% | v2, escrow, SSE e transaction domain desligados |
| Frontend web (backoffice) | ~15–20% | Login + stats + lista de users |
| Mobile (Flutter) | ~50–55% | Usa API v1; não consome bootstrap/v2/escrow |
| Testes automatizados | ~5% | 2 ficheiros; sem cobertura do ledger |
| Integrações externas | 0% | M-Pesa, bancos, SMS/email |

**Bloqueio principal:** muito código avançado existe mas não está registado no `app.js` activo.

---

## Princípios do roadmap

1. **Wiring antes de features novas** — activar o que já está escrito antes de construir mais.
2. **Core financeiro primeiro** — ledger, transferências, escrow têm testes antes de ir a produção.
3. **Uma fonte de verdade na API** — migrar clientes (web + mobile) para v2 + bootstrap.
4. **Entregas pequenas e verificáveis** — cada fase tem critérios de aceitação claros.

---

## Visão por fases

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4
Desbloquear   Produção    Operação    Integrações   Escala
(1 semana)    (2 semanas) (2 semanas) (1 mês)       (futuro)
```

---

## Fase 0 — Desbloquear o sistema (Semana 1)

**Objectivo:** Toda a API escrita fica activa, testável e deployável.

### Tarefas

| # | Tarefa | Prioridade | Responsável |
|---|--------|------------|-------------|
| 0.1 | Corrigir `app.js` — registar v1 completo + v2 + escrow + transaction domain + SSE + refund + secure transfer | P0 | Backend |
| 0.2 | Remover erro de sintaxe de `app.js.erro` (admin routes fora da função) | P0 | Backend |
| 0.3 | Validar arranque local: `npm run dev` sem erros | P0 | Backend |
| 0.4 | Smoke test manual dos endpoints críticos (ver checklist abaixo) | P0 | Backend |
| 0.5 | Deploy Render com API completa | P0 | DevOps |
| 0.6 | Agendar job `expire-transactions.js` (cron Render ou node-cron no boot) | P1 | Backend |
| 0.7 | Limpar ficheiros `.backup`, `.erro`, `.corrompido` do `src/` (ou mover para branch/archive) | P2 | Repo |
| 0.8 | Actualizar `.gitignore` e remover duplicações (`backend/frontend/`, backups no repo) | P2 | Repo |

### Checklist smoke test (Fase 0)

```
[ ] GET  /health
[ ] POST /api/auth/login
[ ] POST /api/auth/refresh
[ ] GET  /api/wallet/balance          (com token)
[ ] GET  /api/v2/bootstrap            (com token)
[ ] POST /api/v2/policy/evaluate      (com token)
[ ] POST /api/transaction             (SECURE)
[ ] POST /api/transaction/confirm
[ ] POST /api/escrow
[ ] POST /api/escrow/confirm
[ ] GET  /api/v2/sse/events?token=…
[ ] GET  /api/admin/stats             (com token admin)
```

### Critérios de aceitação — Fase 0

- [ ] Servidor arranca sem erros com todas as rotas registadas
- [ ] Render deploy verde
- [ ] Smoke test 100% passa em staging
- [ ] Job de expiração documentado e agendado

### Entregável

API unificada v1 + v2 activa em produção.

---

## Fase 1 — Fundação de produção (Semanas 2–3)

**Objectivo:** Confiança no core financeiro + backoffice mínimo operacional.

### 1A — Testes (P0)

| # | Tarefa | Cobertura alvo |
|---|--------|----------------|
| 1.1 | Setup Jest com DB de teste (Prisma) ou containers | Infra |
| 1.2 | Testes unitários: `LedgerEngine` (transfer, lock, saldo insuficiente) | Core |
| 1.3 | Testes integração: auth (login, refresh, logout, OTP) | Auth |
| 1.4 | Testes integração: transaction SECURE (create → confirm → reject → expire) | Transacções |
| 1.5 | Testes integração: escrow (create → confirm → release → dispute → refund) | Escrow |
| 1.6 | Testes integração: Policy Engine (KYC pending bloqueia acção) | Policy |
| 1.7 | Script `npm test` no CI (GitHub Actions básico) | DevOps |

**Critério:** cobertura mínima de 60% em `core/` e `services/transaction*.js`, `services/escrow.service.js`.

### 1B — Observabilidade e docs (P0)

| # | Tarefa |
|---|--------|
| 1.8 | Activar logger Pino no Fastify (substituir `console.log` nos entrypoints) |
| 1.9 | Swagger/OpenAPI em `/docs` — documentar v1 + v2 |
| 1.10 | Actualizar `docs/API.md` com lista completa de endpoints |

### 1C — Backoffice web (P1)

| # | Ecrã / funcionalidade | Endpoint(s) |
|---|----------------------|-------------|
| 1.11 | Dashboard operacional (volume, pendentes, escrows) | `/api/admin/stats` + novos |
| 1.12 | Lista de utilizadores + filtro por role/status | `/api/admin/users` |
| 1.13 | Gestão KYC (aprovar / rejeitar) | novo ou script → API |
| 1.14 | Transacções pendentes (SECURE) | `/api/transaction/pending` |
| 1.15 | Escrows activos + disputas | `/api/escrow/pending`, `/api/escrow/held` |
| 1.16 | Layout admin reutilizável (sidebar, auth guard) | — |

**Critério:** operador consegue aprovar KYC e ver transacções/escrows pendentes sem Postman.

### Entregável Fase 1

Sistema testado no core + backoffice operacional básico + documentação API.

---

## Fase 2 — Unificar clientes (Semanas 4–5)

**Objectivo:** Web e mobile consumem a mesma arquitectura v2.

### 2A — Frontend web (utilizador + merchant)

| # | Tarefa |
|---|--------|
| 2.1 | Integrar `/api/v2/bootstrap` no login (1 request → app pronta) |
| 2.2 | UI dinâmica baseada em `ui.navigation` do bootstrap |
| 2.3 | Ecrã de transferência SECURE / INSTANT |
| 2.4 | Ecrã de escrow (criar, confirmar, libertar) |
| 2.5 | SSE: notificações em tempo real no browser |
| 2.6 | Gestão de perfil + KYC submit |

### 2B — Mobile Flutter

| # | Tarefa |
|---|--------|
| 2.7 | Actualizar `api_routes.dart` para v2 |
| 2.8 | Bootstrap no arranque da app |
| 2.9 | Transferências SECURE com confirmação |
| 2.10 | Escrow básico |
| 2.11 | Push local / in-app via SSE ou polling |

### 2C — Motor de taxas

| # | Tarefa |
|---|--------|
| 2.12 | Taxas configuráveis por `account_type` / tenant (BD ou config) |
| 2.13 | Admin UI para ver taxas aplicadas |

### Entregável Fase 2

Web + mobile alinhados em v2; operador e utilizador final com fluxos completos.

---

## Fase 3 — Operação e compliance (Semanas 6–9)

**Objectivo:** Preparar operação real em Moçambique.

| # | Área | Tarefas |
|---|------|---------|
| 3.1 | **AML básico** | Regras sobre volume, velocity, padrões; alertas + bloqueio automático |
| 3.2 | **Relatórios** | Export CSV: transacções, escrows, KYC, audit log |
| 3.3 | **Notificações** | SMS (OTP produção), email transaccional, push mobile |
| 3.4 | **M-Pesa sandbox** | Cash in / cash out via API Vodacom |
| 3.5 | **Settlement** | Liquidação merchants (batch diário) |
| 3.6 | **Retenção de logs** | Audit log imutável; política 5–7 anos |
| 3.7 | **Runbooks** | Procedimentos: disputa, reembolso, reconciliação, incidente |

### Entregável Fase 3

Operação diária possível com relatórios, alertas e primeiro canal externo (M-Pesa sandbox).

---

## Fase 4 — Escala (futuro, pós-100k users)

| # | Item | Quando |
|---|------|--------|
| 4.1 | Event bus (Redis Streams) | Volume assíncrono alto |
| 4.2 | Redis cluster + SSE cluster | Multi-instância Render/K8s |
| 4.3 | Prometheus + Grafana | SLOs definidos |
| 4.4 | CI/CD completo | Pipeline com testes + deploy automático |
| 4.5 | Integração bancária (BCI, BIM, Standard Bank) | Após licenciamento |
| 4.6 | Microserviços | Só se monólito limitar equipa |

---

## Matriz de dependências

```
Fase 0 (wiring)
    │
    ├──► Fase 1A (testes) ──► Fase 3 (compliance)
    │
    ├──► Fase 1B (docs/logs)
    │
    └──► Fase 1C (backoffice) ──► Fase 2 (clientes v2)
                                        │
                                        └──► Fase 3 (M-Pesa, AML)
```

**Não iniciar:** M-Pesa, AML avançado, microserviços — antes de Fase 0 + 1A completas.

---

## Métricas de progresso

Actualizar semanalmente:

| Métrica | Actual | Meta Fase 0 | Meta Fase 1 | Meta Fase 2 |
|---------|--------|-------------|-------------|-------------|
| Endpoints activos | ~12 | ~35+ | ~35+ | ~35+ |
| Testes automatizados | 2 | 5 smoke | 30+ | 50+ |
| Cobertura core financeiro | ~0% | — | 60% | 70% |
| Ecrãs backoffice | 3 | 3 | 8+ | 12+ |
| Clientes em v2 | 0 | 0 | 0 | 2 (web + mobile) |

---

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `app.js` completo quebra deploy | Alto | Testar local + staging antes de merge |
| Ledger divergente | Crítico | Testes + `npm run reconcile` no CI |
| Dois APIs (v1/v2) para sempre | Médio | v1 legacy; novos features só em v2 |
| Redis indisponível | Baixo | Cache em memória já implementado |
| Regulação BM | Alto | Fase 3 compliance; não lançar público antes |

---

## Próximo passo imediato

**Começar Fase 0.1:** corrigir e activar `app.js` completo.

Ordem de execução sugerida para a primeira sessão de trabalho:

1. Copiar registos de rotas de `app.js.erro` → `app.js` (corrigindo sintaxe)
2. `npm run dev` + smoke test
3. Commit: `feat: activate full API routes (v1 + v2 + escrow + SSE)`
4. Deploy Render + validar `/health` e `/api/v2/bootstrap`

---

## Referências no repo

| Componente | Localização |
|------------|-------------|
| App activo | `backend/src/app.js` |
| App completo (referência) | `backend/src/app.js.erro` |
| Policy Engine | `backend/src/modules/policy/` |
| Bootstrap | `backend/src/modules/bootstrap/` |
| Ledger | `backend/src/core/ledger.engine.js` |
| Escrow | `backend/src/services/escrow.service.js` |
| Transaction Domain | `backend/src/services/transaction.domain.service.js` |
| Job expiração | `backend/src/jobs/expire-transactions.js` |
| Frontend admin | `frontend/src/pages/Admin/` |
| Mobile | `mobile/lib/` |

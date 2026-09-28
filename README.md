# PAWO

A deterministic trading-analysis system. PAWO reads market data, applies one written strategy
rulebook, and reports what that rulebook concluded — with the evidence, the provenance and the
reasons attached. It models positions on paper so a strategy can be judged against its own history.

**PAWO places no orders.** There is no broker integration, no order transport, no account it can
mutate, and no real-money path in any phase. A "trade" here is a modelled record inside PAWO, and
an architectural test asserts that no order, venue, balance or execution machinery exists anywhere
in the source tree, the migrations or the workflow artifacts.

> **Not cleared for release.** Gate C — third-party licensing and clean-room review — is
> **unresolved**. Every phase through Phase 10a is technically complete and none is legally cleared.
> See `Pawo App/docs/29_PRE_PHASE1_GATES.md`.

---

## What it does

| Layer | What it decides |
| --- | --- |
| **Market data** | Fetches, verifies and stores candles with quality and staleness recorded as facts, not assumptions. Provider-independent; the only adapter is TVRemix. |
| **Strategy** | Detects structure, liquidity, ICT/SMC/SMT/CRT and price-action evidence over a declared timeframe set, and assembles setups with a lineage from each piece of evidence to its root event. |
| **Confluence** | Scores evidence, applies gates, and returns one of a closed set of decision statuses. `NO_TRADE` is the usual answer, and it is an answer. |
| **Risk** | Sizes a theoretical position from a declared risk profile and verified contract facts — or reports, in typed form, exactly which declaration is missing. Nothing is defaulted. |
| **Research** | Runs studies over a three-way chronological split with walk-forward validation, sensitivity and bootstrap statistics, and concludes `invalidated`, `inconclusive`, `unsupported` or `supported`. |
| **AI reasoning** | Interprets a deterministic decision, subordinate to it, against a verified schema. A rejected or failed interpretation is stored as such; it never becomes the headline. |
| **Paper trading** | Advances a modelled position through eight lifecycle states using one execution model, with modelled values and the observed fill bar recorded apart from each other. |
| **Automation** | A service-credential API for n8n, with an idempotency ledger, dead-lettering and operator replay. |
| **Application API** | A user-authenticated, read-only surface (`/api/v1/app/*`) that projects the above for a dashboard. |

The organising rule across all of it: **PAWO reports what it computed, and says plainly when it
cannot compute something.** A missing declaration, stale data or an unresolved outcome is a typed
state with a reason — never a zero, a guess or a blank chart.

## Architecture in one pass

```
market data ─→ strategy ─→ confluence ─→ risk ──┐
   (shared)     (pure)      (pure)      (pure)  │
                                                ├─→ research.simulation  ← the one execution model
                                                │        ↑            ↑
                                                │   research.evaluation │ paper.lifecycle
                                                │      (batch)          │  (incremental)
                                                ▼                       │
                                          pawo.services ────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
             REST /api/v1/app            MCP (13 tools)          REST /api/v1/automation
              user token, GET-only        user token             workspace service credential
```

- The deterministic engine (`strategy`, `confluence`, `risk`, `market`, `research`, `ai`) never
  imports a service, a transport or the paper subsystem. Architectural tests enforce the direction.
- **One execution model.** `research.simulation.simulate_trade` is the only code that turns a
  decision and candles into an outcome. Exactly two drivers call it: the batch driver in
  `research.evaluation` and the incremental driver in `paper.lifecycle`.
- Every transport is a projection over `pawo.services`. Where REST and MCP answer the same
  question, a test compares the two answers field by field.

## Multi-tenancy

Two boundaries, always both. Every query against a tenant-scoped table filters on `tenant_id`
explicitly **and** runs inside a `tenant_transaction` under forced PostgreSQL row-level security.
The tenant is never taken from client input: the application API accepts no tenant identifier at
all, and derives it from the caller's own memberships.

A resource outside the caller's tenant is `404`, indistinguishable from one that does not exist. A
resource inside their tenant that their role forbids is `403`. Roles are tenant-scoped and apply in
every workspace of that tenant.

The application role is deliberately weak: it is not the schema owner, holds no `BYPASSRLS`, cannot
read the audit trail, and cannot write a research run. Where a read needs something the role must
not hold in general, it goes through a `SECURITY DEFINER` function with an explicit `EXECUTE` grant
rather than a wider privilege.

## Getting started

Requires **Python 3.12+** and **PostgreSQL 13+** (the migrations use the built-in `gen_random_uuid`).

```bash
make install                      # editable install with dev extras
cp .env.example .env              # then fill it in
make db-setup                     # creates the dev roles (psql, superuser)
make migrate                      # alembic upgrade head, as the migration role
make run                          # uvicorn pawo.main:app --reload
```

Separate database roles, with separate credentials, are not optional:

| Role | Purpose |
| --- | --- |
| `pawo_app` | the application. Subject to RLS, not the owner, no `BYPASSRLS`. |
| `pawo_migration` | schema owner; Alembic only, never the API. |
| `pawo_ingest` | writes shared market-reference tables only. |
| `pawo_research_publisher` | optional; `EXECUTE` on `research_publish` and no table `INSERT`. |

Running the application as the owner would silently disable the second isolation boundary in
production while every test on a correctly configured machine kept passing. Verify the deployment,
don't assume it.

## Operator commands

There is no self-service registration, no password reset endpoint and no web path that creates a
credential, a declaration or a research run. Those are operator acts:

```bash
python -m pawo.auth.provision --email someone@example.com        # set a password
python -m pawo.automation.provision create --tenant T --workspace W --name n8n-staging
python -m pawo.paper.provision contract|profile|model|enable|kill-switch
python -m pawo.research.publish --tenant T --workspace W --report study.json
python -m pawo.automation.n8n build|render --environment X|validate
PAWO_MCP_ACCESS_TOKEN=... python -m pawo.mcp.stdio               # MCP over stdio, local dev
```

Every paper-trading declaration is versioned: a new one supersedes the active row and the old
version stays, so a trade computed under it stays reproducible. `publish` requires a publisher
credential (`PAWO_RESEARCH_DATABASE_URL` or the migration credential) — pointing it at
`DATABASE_URL` fails rather than escalating.

## Tests

```bash
make test        # unit tests; integration tests skip without a database
make check       # lint + strict types + tests
```

Integration tests need a real PostgreSQL, because row-level security cannot be simulated. They skip
unless these are set:

```bash
export PAWO_TEST_DATABASE_URL=...            # pawo_app — subject to RLS
export PAWO_TEST_OWNER_DATABASE_URL=...      # pawo_migration — proves FORCE RLS binds the owner
export PAWO_TEST_SUPERUSER_DATABASE_URL=...  # fixtures only
export PAWO_TEST_PUBLISHER_DATABASE_URL=...  # optional; the research publisher role
```

The live n8n suite additionally needs Docker and the pinned n8n image, and skips without them.

Beyond the usual unit and integration coverage, the suite asserts architectural properties directly:
layering and import direction, that the paper kernel is pure and owns no price rule, that no
mutating verb exists under `/api/v1/app/*`, that REST and MCP project identical values, that the
application role cannot read `system_events`, and that no file names or mentions a reference
repository.

## Layout

```
src/pawo/
  strategy/ confluence/ risk/         the deterministic engine — pure, no I/O
  market/                             ingestion, quality, provider protocol, adapters
  research/                           protocol, simulation, walk-forward, statistics, store
  ai/                                 context, prompt, provider, verification
  paper/                              lifecycle kernel, model, repository, provisioning
  services/                           transport-neutral reads: one answer, many surfaces
  api/                                FastAPI app; routers/app is the Phase 10a read surface
  mcp/                                MCP server, 13 tools, all read-only
  automation/                         service-credential API, ledger, n8n artifacts
  auth/ db/                           identity, capabilities, audit, tenancy, models
migrations/versions/                   0001–0011
automation/n8n/                        generated workflow JSON, validated by test
Pawo App/docs/                         the specifications this code implements
Pawo App/docs/architecture/            ADR-0001 MCP · 0002 automation · 0003 paper · 0004 dashboard
Pawo App/reports/                      per-phase completion reports
```

`Pawo App/DOCUMENT_INDEX.md` is the map. The specifications are authoritative: where code and a
document disagree, one of them is a bug, and the completion reports say which.

## Status

| Phase | State |
| --- | --- |
| 1–6 | Foundations, market data, strategy, confluence/risk, research, AI reasoning — complete |
| 7 | MCP server — complete |
| 8 | n8n automation — complete |
| 9 | Paper trading — complete |
| 10a | User-facing application API — complete; `/app/setups` and `/app/interpretations` await owner decision W-4 |
| 10b | Dashboard frontend — not begun; awaits W-8 and acceptance of 10a |

Gate C remains unresolved, so nothing here is cleared for release.

## Licence and provenance

No source from OpenAlgo, Hinto Trader or QuantDash has been read for, or copied into, any phase.
Clean-room implementation is the engineering policy; `references/` is untouched by implementation
work. OpenAlgo is AGPL-3.0 and QuantDash's licensing is unresolved — legal review is required before
releasing anything that relies on OpenAlgo-derived patterns. See `Pawo App/THIRD_PARTY_NOTICES.md`
and `Pawo App/docs/28_REPOSITORY_PROVENANCE_AND_REUSE.md`.

Nothing in this repository is financial advice, and no output of it is an instruction to trade.

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


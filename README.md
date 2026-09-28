# Ai-Trading-Intelligence
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


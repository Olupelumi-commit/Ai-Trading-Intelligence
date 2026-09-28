# PAWO n8n automation artifacts

**n8n orchestrates. Python decides.** These artifacts contain triggers, routing, batching, retries,
correlation ids, idempotency keys, notifications and health checks — and no market logic. The
contract is `Pawo App/docs/15_N8N_WORKFLOWS.md`; the decisions are ADR-0002.

Verified against n8n **2.39.7** (`docker.n8n.io/n8nio/n8n:2.39.7`,
digest `sha256:54323be085a6086acd87f612a25752d6582d3a0c0b07cc93c2b40a9356c3203b`).

## Layout

| Path | What it is |
| --- | --- |
| `workflows/` | the nine committed workflow definitions, with configuration placeholders and no credential values |
| `code/` | the Code-node sources; `_prelude.js` is prepended to each one at build time |
| `environments/` | per-environment configuration — base URLs, chat id, schedules, bounds, credential ids. **No secrets.** |
| `manifest.json` | workflow versions, schema version, PAWO API compatibility, node versions, runtime assumptions |
| `n8n.env.example` | the n8n deployment settings PAWO assumes (security, retention, addressing) |
| `build/` | rendered, environment-specific output. Untracked. |

`workflows/` is generated from `src/pawo/automation/n8n/definitions.py`; a test fails if the
committed files and a rebuild differ. Edit the Python definitions or the JS sources, never the JSON.

## Commands

```bash
python -m pawo.automation.n8n build                  # regenerate the committed JSON
python -m pawo.automation.n8n validate               # structure, node versions, boundaries, secrets
python -m pawo.automation.n8n render --environment automation/n8n/environments/development.json
```

## Deploying

1. **Create the PAWO credential** (once per workspace; the secret is printed once):
   ```bash
   python -m pawo.automation.provision create --tenant <uuid> --workspace <uuid> --name n8n-staging
   ```
2. **Create the three n8n credentials** in the n8n credential store and note their ids:
   `PAWO Automation API` (Header Auth, name `X-PAWO-Service-Credential`, value the secret above),
   `PAWO Webhook JWT` (JWT Auth, passphrase, HS256, the shared webhook signing secret) and
   `PAWO Telegram` (the bot token).
3. **Fill the environment file** — copy `staging.example.json`, set the base URLs, chat id,
   schedules, webhook paths and those credential ids. Never put a credential value in it; `render`
   refuses one.
4. **Render and import**:
   ```bash
   python -m pawo.automation.n8n render --environment automation/n8n/environments/staging.json
   n8n import:workflow --separate --input=automation/n8n/build/staging
   # Publish all nine: an unpublished workflow cannot even be called as a sub-workflow.
   for w in pawoLibAttempt01 pawoLibCall00001 pawoErrHandler01 pawoN8n001Analy \
            pawoN8n002Scan0 pawoN8n003Alert pawoN8n004Outcm pawoN8n005Rport pawoN8n006Healt; do
     n8n publish:workflow --id=$w
   done
   # Publishing activates a workflow that has a trigger; this makes it explicit and is safe to
   # repeat. A schedule with an impossible date (for example 31 February) fails activation.
   for w in pawoN8n001Analy pawoN8n002Scan0 pawoN8n003Alert pawoN8n004Outcm \
            pawoN8n005Rport pawoN8n006Healt; do
     n8n update:workflow --id=$w --active=true
   done
   ```
5. **Restart n8n.** Production webhooks register when an active, published workflow starts.
6. **Check** `PAWO-N8N-006-HealthCheck` once by hand (`n8n execute --id=pawoN8n006Healt`) before
   relying on the schedules.

The committed artifacts are inactive, and the workflow ids are fixed so sub-workflow references and
webhook paths stay valid across environments. Do not edit a production workflow in the editor: it
would diverge from the artifact silently.

## What each workflow assumes

- Every PAWO request goes through `PAWO-N8N-LIB-PawoCall`, which bounds attempts, backs off
  exponentially, honours `Retry-After` and classifies failures as transient, permanent or unknown.
- Every side effect is claimed in PAWO's ledger first, so a repeated delivery, a retried execution
  and a scheduled re-run converge on one notification.
- A notification is sent only when PAWO re-verifies the setup as alertable at that moment, with
  PAWO's own text.
- An unconfirmed send is dead-lettered, never resent automatically.
- `PAWO-N8N-004-OutcomeUpdate` asks PAWO which paper trades can still advance and asks PAWO to
  advance each one (Phase 9). It simulates nothing: every price, state and outcome is PAWO's, and
  the tick key names the trade and the bar so a re-run in the same bar changes nothing. Where paper
  trading is switched off, it reports the typed dependency and stops.

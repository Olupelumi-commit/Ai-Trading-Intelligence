// PAWO n8n shared helpers (prepended to every Code node by `python -m pawo.automation.n8n build`).
//
// Orchestration only: identifiers, envelope validation, idempotency keys, error classification and
// presentation. No ICT, SMC, SMT, CRT, price-action, confluence, risk or qualification logic — those
// live in Python and reach the workflow only as deterministic fields of a PAWO response.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYMBOL = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const SETUP_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const CORRELATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_EVENT_BYTES = 8192;
const MAX_CLOCK_SKEW_SECONDS = 300;
const EVENT_SCHEMA_VERSION = 'pawo-event-1';

// The only paths any workflow may call. An SSRF guard: the host comes from configuration and the
// path from this list, never from a payload.
const PAWO_PATHS = [
  '/api/v1/automation/watchlist',
  '/api/v1/automation/analyses',
  '/api/v1/automation/setups/verify',
  '/api/v1/automation/interpretations',
  '/api/v1/automation/ledger/claims',
  '/api/v1/automation/ledger/completions',
  '/api/v1/automation/ledger/sweeps',
  '/api/v1/automation/ledger/unresolved',
  '/api/v1/automation/ledger/replays',
  '/api/v1/automation/failures',
  '/api/v1/automation/reports/daily',
  '/api/v1/automation/outcomes/open',
  '/api/v1/automation/outcomes/updates',
  '/api/v1/automation/paper/trades',
  '/api/v1/automation/health',
];

function isUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

function text(value, pattern, max) {
  return typeof value === 'string' && value.length <= max && pattern.test(value);
}

function correlationId(supplied, fallback) {
  // A caller-supplied id is used only after validation; it is for tracing, never authorization.
  return text(supplied, CORRELATION, 128) ? supplied : `n8n-${fallback}`;
}

function bucket(when, minutes) {
  const at = new Date(when);
  const size = minutes * 60000;
  return new Date(Math.floor(at.getTime() / size) * size).toISOString().replace(/[:.]/g, '-');
}

function idempotencyKey(parts) {
  const key = parts.filter((p) => p !== null && p !== undefined && p !== '').join(':');
  return key.slice(0, 200);
}

function withinSkew(occurredAt, now) {
  const at = Date.parse(occurredAt);
  if (Number.isNaN(at)) return false;
  return Math.abs(new Date(now).getTime() - at) <= MAX_CLOCK_SKEW_SECONDS * 1000;
}

// Validates the documented envelope and its binding to the verified JWT. The token is already
// signature- and expiry-checked by the Webhook node; this rejects an envelope the token does not
// cover, and a token without the claims PAWO issues.
function validateEnvelope(item, expectedType, now) {
  const body = item.body;
  const claims = item.jwtPayload || {};
  const reject = (reason) => ({ valid: false, reason });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reject('malformed_json');
  if (JSON.stringify(body).length > MAX_EVENT_BYTES) return reject('payload_too_large');
  if (body.schema_version !== EVENT_SCHEMA_VERSION) return reject('unsupported_schema_version');
  if (!isUuid(body.event_id)) return reject('invalid_event_id');
  if (body.event_type !== expectedType) return reject('unexpected_event_type');
  if (!withinSkew(body.occurred_at, now)) return reject('stale_or_future_event');
  const data = body.data;
  if (!data || typeof data !== 'object') return reject('missing_data');
  if (!text(data.symbol, SYMBOL, 32)) return reject('invalid_symbol');
  if (data.setup_id !== undefined && data.setup_id !== null && !text(data.setup_id, SETUP_ID, 128))
    return reject('invalid_setup_id');
  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return reject('token_claims_missing');
  if (claims.exp - claims.iat > MAX_CLOCK_SKEW_SECONDS) return reject('token_lifetime_too_long');
  if (claims.jti !== body.event_id) return reject('token_event_mismatch');
  if (claims.evt !== body.event_type) return reject('token_type_mismatch');
  const subject = data.setup_id || data.symbol;
  if (claims.sub !== subject) return reject('token_subject_mismatch');
  return {
    valid: true,
    reason: 'ok',
    event_id: body.event_id,
    event_type: body.event_type,
    symbol: data.symbol,
    setup_id: data.setup_id || null,
    occurred_at: body.occurred_at,
  };
}

const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

// Error codes leave PAWO already safe; anything else is reduced to a label. No message text,
// stack trace, URL, header or credential is ever propagated.
function safeCode(value, fallback) {
  if (typeof value === 'string' && SAFE_ERROR_CODE.test(value)) return value;
  return fallback;
}

// Maps an HTTP outcome to a retry class. Transient failures may recover; permanent ones never do
// and are not retried. Anything unrecognised fails closed as `unknown`, which is not retried.
function classifyStatus(status, rawCode) {
  // The code is sanitised here too, so no upstream message text can reach a retry decision.
  const code = safeCode(rawCode, null);
  if (status >= 200 && status < 300) return { classification: 'ok', error_code: null };
  if (status === 429) return { classification: 'transient', error_code: 'RATE_LIMITED' };
  if (status === 408 || status === 425) return { classification: 'transient', error_code: 'TIMEOUT' };
  if (status === 502 || status === 503 || status === 504)
    return { classification: 'transient', error_code: code || 'DEPENDENCY_UNAVAILABLE' };
  if (status === 500) return { classification: 'transient', error_code: 'INTERNAL_ERROR' };
  if (status >= 400 && status < 500)
    return { classification: 'permanent', error_code: code || 'REQUEST_REJECTED' };
  return { classification: 'unknown', error_code: code || 'UNEXPECTED_STATUS' };
}

function backoffSeconds(attempt, base, cap, retryAfter) {
  if (typeof retryAfter === 'number' && retryAfter > 0) return Math.min(retryAfter, cap);
  return Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), cap);
}

// Telegram renders with a parse mode; PAWO's text is plain, so the only safe transform is to
// escape the three characters HTML mode treats as markup. Nothing else is altered.
function plainText(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function summaryOf(analysis) {
  // Presentation only: counts and identifiers the deterministic response already contains.
  const decisions = Array.isArray(analysis.decisions) ? analysis.decisions : [];
  return {
    analysis_id: analysis.analysis_id || null,
    symbol: analysis.symbol || null,
    status: analysis.status || null,
    decision_count: decisions.length,
    alertable: decisions.filter((d) => d.alertable === true).map((d) => d.setup_id),
  };
}

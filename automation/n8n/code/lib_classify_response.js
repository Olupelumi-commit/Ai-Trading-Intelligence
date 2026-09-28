// LIB attempt step 3: turn the HTTP result into a typed, retryable outcome and echo the request
// state so the caller needs no cross-node reference inside its retry loop.
const state = $('Attempt input').first().json;
const item = $input.first().json;
const failed = item.error !== undefined && item.statusCode === undefined;
const status = failed ? 0 : Number(item.statusCode);
const payload = item.body && typeof item.body === 'object' ? item.body : {};
const error = payload.error && typeof payload.error === 'object' ? payload.error : {};
const verdict = failed
  ? { classification: 'transient', error_code: 'NETWORK_ERROR' }
  : classifyStatus(status, safeCode(error.code, null));
const retryAfter = Number((item.headers || {})['retry-after']);

return [
  {
    json: {
      ...state,
      ok: verdict.classification === 'ok',
      http_status: status,
      classification: verdict.classification,
      error_code: verdict.error_code,
      error_details: error.details || null,
      retry_after_seconds: Number.isFinite(retryAfter) ? retryAfter : null,
      response: verdict.classification === 'ok' ? payload : null,
    },
  },
];

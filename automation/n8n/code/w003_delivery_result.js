// N8N-003 step 5: record what happened to the notification. A send whose outcome is unknown is
// reported `UNCONFIRMED`, which PAWO dead-letters instead of retrying, because a retry could
// deliver the same alert twice.
const item = $input.first().json;
const state = $('Send decision').first().json;
const failure = item.error !== undefined || item.ok === false;
const status = Number((item.error && item.error.httpCode) || item.httpCode || 0);
let outcome = 'SUCCEEDED';
let code = null;
if (failure) {
  if (status === 429 || status === 420) {
    outcome = 'FAILED_TRANSIENT';
    code = 'RATE_LIMITED';
  } else if (status >= 400 && status < 500) {
    outcome = 'FAILED_PERMANENT';
    code = 'NOTIFICATION_REJECTED';
  } else {
    // A timeout or 5xx may have been delivered: never resend automatically.
    outcome = 'UNCONFIRMED';
    code = 'DELIVERY_UNCONFIRMED';
  }
}
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/ledger/completions',
      correlation_id: state.correlation_id,
      workflow_id: 'N8N-003',
      delivered: outcome === 'SUCCEEDED',
      body: {
        idempotency_key: state.idempotency_key,
        claim_token: state.claim_token,
        outcome,
        error_code: code || undefined,
        dependency: failure ? 'telegram' : undefined,
        summary: {
          setup_id: state.setup_id,
          symbol: state.symbol,
          message_id: (item.result && item.result.message_id) || item.message_id || null,
        },
      },
    },
  },
];

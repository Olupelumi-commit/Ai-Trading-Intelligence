// Shared step: report the delivery outcome, with an ambiguous send recorded as UNCONFIRMED.
const item = $input.first().json;
const state = $('Send decision').first().json;
const failure = item.error !== undefined || item.ok === false;
const status = Number((item.error && item.error.httpCode) || item.httpCode || 0);
let outcome = 'SUCCEEDED';
let code = null;
if (failure) {
  if (status === 429) {
    outcome = 'FAILED_TRANSIENT';
    code = 'RATE_LIMITED';
  } else if (status >= 400 && status < 500) {
    outcome = 'FAILED_PERMANENT';
    code = 'NOTIFICATION_REJECTED';
  } else {
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
      workflow_id: state.workflow_id,
      body: {
        idempotency_key: state.idempotency_key,
        claim_token: state.claim_token,
        outcome,
        error_code: code || undefined,
        dependency: failure ? 'telegram' : undefined,
        summary: { message_id: (item.result && item.result.message_id) || item.message_id || null },
      },
    },
  },
];

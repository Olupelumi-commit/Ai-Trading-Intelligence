// N8N-001 step 1: validate the delivery before anything else happens. The Webhook node has already
// verified the JWT signature and expiry; this checks the envelope, its binding to that token, the
// payload size and the clock, then derives the correlation id and idempotency key.
const item = $input.first().json;
const now = new Date().toISOString();
const verdict = validateEnvelope(item, 'pawo.analysis.requested', now);
if (!verdict.valid) {
  return [{ json: { valid: false, reason: verdict.reason, received_at: now } }];
}
const headers = item.headers || {};
return [
  {
    json: {
      ...verdict,
      received_at: now,
      correlation_id: correlationId(headers['x-correlation-id'], verdict.event_id),
      idempotency_key: idempotencyKey(['n8n-001', 'analysis', verdict.event_id]),
    },
  },
];

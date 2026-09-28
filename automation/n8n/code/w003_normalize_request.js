// N8N-003 step 1: accept an alert request from a signed PAWO webhook or from the scheduled scan,
// and reduce both to the same minimal instruction. Nothing from the payload is trusted beyond the
// symbol and setup id, which PAWO re-verifies before any message is sent.
const item = $input.first().json;
const now = new Date().toISOString();
const fromWebhook = item.body !== undefined && item.headers !== undefined;
if (fromWebhook) {
  const verdict = validateEnvelope(item, 'pawo.setup.alert_requested', now);
  if (!verdict.valid) return [{ json: { valid: false, reason: verdict.reason, received_at: now } }];
  if (!verdict.setup_id) return [{ json: { valid: false, reason: 'missing_setup_id', received_at: now } }];
  return [
    {
      json: {
        valid: true,
        source: 'webhook',
        symbol: verdict.symbol,
        setup_id: verdict.setup_id,
        event_id: verdict.event_id,
        received_at: now,
        correlation_id: correlationId((item.headers || {})['x-correlation-id'], verdict.event_id),
      },
    },
  ];
}
const internal = item;
const valid =
  typeof internal.symbol === 'string' &&
  SYMBOL.test(internal.symbol) &&
  typeof internal.setup_id === 'string' &&
  SETUP_ID.test(internal.setup_id);
return [
  {
    json: valid
      ? {
          valid: true,
          source: internal.source || 'internal',
          symbol: internal.symbol,
          setup_id: internal.setup_id,
          event_id: null,
          received_at: now,
          correlation_id: correlationId(internal.correlation_id, `003-${internal.setup_id}`),
        }
      : { valid: false, reason: 'invalid_internal_request', received_at: now },
  },
];

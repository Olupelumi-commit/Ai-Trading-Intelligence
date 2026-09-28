// N8N-002 step 2: turn the PAWO watchlist into one bounded batch plan. Symbols, batch size and
// pacing all come from PAWO; the workflow adds only keys and a time bucket, so a scan that runs
// twice in the same bucket claims the same keys and runs once.
const call = $input.first().json;
if (!call.ok) {
  return [{ json: { failed: true, error_code: safeCode(call.error_code, 'WATCHLIST_UNAVAILABLE') } }];
}
const watchlist = call.response || {};
const symbols = Array.isArray(watchlist.symbols) ? watchlist.symbols : [];
const started = new Date().toISOString();
const slot = bucket(started, 15);
const correlation = correlationId(null, `002-${slot}`);
return symbols.map((symbol) => ({
  json: {
    method: 'POST',
    path: '/api/v1/automation/analyses',
    body: { symbol },
    symbol,
    state: { symbol, scan_slot: slot },
    idempotency_key: idempotencyKey(['n8n-002', 'scan', symbol, slot]),
    correlation_id: correlation,
    workflow_id: 'N8N-002',
    batch_size: Math.max(1, Number(watchlist.batch_size || 1)),
    batch_interval_seconds: Math.max(0, Number(watchlist.batch_interval_seconds || 0)),
    max_attempts: Number(watchlist.max_attempts || __PAWO_MAX_ATTEMPTS__),
    scan_slot: slot,
    scan_started_at: started,
  },
}));

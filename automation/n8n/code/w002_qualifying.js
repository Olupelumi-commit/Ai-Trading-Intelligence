// N8N-002 step 4: route on PAWO's own classification. The workflow reads `alertable`, which PAWO
// computed from the deterministic decision; it recreates no score, gate, risk or confluence rule.
const results = $input.all().map((i) => i.json);
const alerts = [];
const failures = [];
for (const result of results) {
  const state = result.state || {};
  if (!result.ok) {
    failures.push({
      symbol: state.symbol || null,
      error_code: safeCode(result.error_code, 'ANALYSIS_FAILED'),
      classification: result.classification,
      attempts: result.attempts,
    });
    continue;
  }
  const analysis = result.response || {};
  for (const decision of Array.isArray(analysis.decisions) ? analysis.decisions : []) {
    if (decision.alertable === true) {
      alerts.push({
        symbol: analysis.symbol,
        setup_id: decision.setup_id,
        classification: decision.classification,
        correlation_id: result.correlation_id,
        scan_slot: state.scan_slot || null,
        source: 'N8N-002',
      });
    }
  }
}
return [{ json: { alerts, failures, analysed: results.length } }];

// N8N-004 step 5: what the ticks did. Counts only; no outcome is computed here.
const results = $input.all().map((i) => i.json);
const advanced = [];
const failures = [];
for (const result of results) {
  const state = result.state || {};
  if (result.ok) {
    const trade = (result.response || {}).trade || {};
    if (trade.state && trade.state !== state.previous_state) {
      advanced.push({ trade_id: state.trade_id, from: state.previous_state, to: trade.state });
    }
    continue;
  }
  failures.push({
    trade_id: state.trade_id || null,
    error_code: safeCode(result.error_code, 'TICK_FAILED'),
    classification: result.classification,
    attempts: result.attempts,
  });
}
return [{ json: { ticked: results.length, advanced, failures } }];

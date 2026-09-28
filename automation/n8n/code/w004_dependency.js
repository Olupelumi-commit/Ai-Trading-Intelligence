// N8N-004 step 2: what PAWO said about its outcome service.
//
// Phase 9 serves this endpoint, so the normal answer is a list of paper trades that can still
// advance. The blocked branch is kept for a deployment where paper trading is not available: the
// workflow reports the typed dependency and stops rather than inventing an outcome.
const call = $input.first().json;
const details = call.error_details || {};
const blocked =
  call.error_code === 'DATA_UNAVAILABLE' && details.reason === 'outcome_store_not_implemented';
const response = call.response || {};
const trades = Array.isArray(response.trades) ? response.trades : [];
return [
  {
    json: {
      available: call.ok === true,
      blocked,
      reason: blocked
        ? details.reason
        : call.ok === true
          ? 'ok'
          : safeCode(call.error_code, 'OUTCOME_SERVICE_UNAVAILABLE'),
      blocked_by: blocked ? details.blocked_by || 'phase_9' : null,
      trades,
      open_count: trades.length,
      latest_closed_bar: response.latest_closed_bar || null,
      correlation_id: call.correlation_id,
    },
  },
];

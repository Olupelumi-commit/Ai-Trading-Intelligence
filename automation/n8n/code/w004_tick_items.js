// N8N-004 step 3: one tick request per open paper trade.
//
// The key carries the trade and the bar PAWO has already stored, so a re-run in the same bar is a
// duplicate and advances nothing. PAWO decides every state; this only addresses the call.
const item = $input.first().json;
const trades = Array.isArray(item.trades) ? item.trades : [];
const bar = item.latest_closed_bar || 'no-bar';
return trades.map((trade) => ({
  json: {
    method: 'POST',
    path: '/api/v1/automation/outcomes/updates',
    body: { trade_id: trade.trade_id },
    state: { trade_id: trade.trade_id, symbol: trade.symbol, previous_state: trade.state },
    idempotency_key: idempotencyKey(['n8n-004', 'tick', trade.trade_id, bar]),
    correlation_id: item.correlation_id,
    workflow_id: 'N8N-004',
  },
}));

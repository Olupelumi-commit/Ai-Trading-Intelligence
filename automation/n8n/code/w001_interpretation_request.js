// N8N-001 step 3: route to the AI interpretation only when PAWO itself marked a decision alertable,
// and only when this environment enables it. The deterministic result stands on its own.
const call = $input.first().json;
const analysis = call.response || {};
const summary = summaryOf(analysis);
const enabled = '__PAWO_ALERT_AI__' === 'true';
const target = summary.alertable[0] || null;
return [
  {
    json: {
      interpret: enabled && target !== null,
      method: 'POST',
      path: '/api/v1/automation/interpretations',
      body: { symbol: summary.symbol, setup_id: target },
      idempotency_key: idempotencyKey(['n8n-001', 'interpretation', target || 'none']),
      correlation_id: call.correlation_id,
      workflow_id: 'N8N-001',
      state: { analysis: analysis, analysis_summary: summary },
      analysis: analysis,
      analysis_summary: summary,
    },
  },
];

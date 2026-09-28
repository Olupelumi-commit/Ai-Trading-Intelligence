// N8N-005 step 2: format PAWO's figures. Every number here is one PAWO returned; unavailable
// sections are named as unavailable rather than filled in, and no AI narrative is attached because
// no verifier for one exists.
const call = $input.first().json;
if (!call.ok) {
  return [
    {
      json: {
        deliverable: false,
        error_code: safeCode(call.error_code, 'REPORT_UNAVAILABLE'),
        correlation_id: call.correlation_id,
      },
    },
  ];
}
const report = call.response || {};
const ledger = Array.isArray(report.ledger) ? report.ledger : [];
const byStatus = {};
for (const row of ledger) {
  const bucketKey = `${row.workflow_id} ${row.operation} ${row.status}`;
  byStatus[bucketKey] = (byStatus[bucketKey] || 0) + Number(row.count || 0);
}
const interpretations = report.ai_interpretations || {};
// A section is either available with PAWO's own figures, or named as unavailable with its reason.
// Nothing here estimates a number PAWO did not return (Phase 9, owner decision S-5).
const section = (name, value) => {
  const payload = value || {};
  if (payload.available !== true) {
    return [`- ${name}: unavailable (${payload.reason || 'unknown'})`];
  }
  return [`- ${name}:`, ...Object.entries(payload)
    .filter(([key, entry]) => key !== 'available' && entry !== null && typeof entry !== 'object')
    .map(([key, entry]) => `  - ${key}: ${entry}`)];
};
const lines = [
  `PAWO daily report ${report.report_date} (__PAWO_ENVIRONMENT__)`,
  `Strategy: ${report.strategy_version}`,
  '',
  'Workflow activity:',
  ...(Object.keys(byStatus).length
    ? Object.entries(byStatus).map(([k, v]) => `- ${k}: ${v}`)
    : ['- none']),
  '',
  'AI interpretations:',
  ...Object.entries(interpretations).map(([k, v]) => `- ${k}: ${v}`),
  '',
  `Unresolved records awaiting recovery: ${report.unresolved}`,
  '',
  'Paper trading:',
  ...section('Trade outcomes', report.outcomes),
  ...section('Performance', report.performance),
  ...section('AI narrative', report.ai_narrative),
  '',
  'Decision support only. PAWO places no orders.',
];
return [
  {
    json: {
      deliverable: true,
      report_date: report.report_date,
      correlation_id: call.correlation_id,
      text: lines.join('\n'),
      idempotency_key: idempotencyKey(['n8n-005', 'report', report.report_date]),
    },
  },
];

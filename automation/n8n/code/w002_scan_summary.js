// N8N-002 step 6: a failure summary for operators. Counts only; no statistic is invented and no
// notification is sent when nothing failed.
const item = $input.first().json;
const failures = Array.isArray(item.failures) ? item.failures : [];
const slot = item.scan_slot || bucket(new Date().toISOString(), 15);
const lines = failures.map((f) => `- ${f.symbol || 'unknown'}: ${f.error_code} (${f.attempts}x)`);
return [
  {
    json: {
      escalate: failures.length > 0,
      analysed: item.analysed || 0,
      failed: failures.length,
      alerts: (item.alerts || []).length,
      correlation_id: item.correlation_id || correlationId(null, `002-${slot}`),
      idempotency_key: idempotencyKey(['n8n-002', 'scan-summary', slot]),
      text: [
        `PAWO scheduled scan (__PAWO_ENVIRONMENT__)`,
        `Analysed: ${item.analysed || 0}`,
        `Alertable setups: ${(item.alerts || []).length}`,
        `Failures: ${failures.length}`,
        ...lines,
      ].join('\n'),
    },
  },
];

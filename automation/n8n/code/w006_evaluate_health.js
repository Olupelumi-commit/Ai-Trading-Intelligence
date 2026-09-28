// N8N-006: combine the dependency reports. It only observes: nothing here restarts, reconfigures or
// disables anything, and a degraded provider never becomes market data.
const pawo = $('PAWO health').first().json;
const n8n = $('n8n health').first().json;
const sweep = $('Sweep abandoned claims').first().json;
const unresolved = $('Unresolved records').first().json;
const telegram = $input.first().json;

const health = pawo.ok ? pawo.response || {} : {};
const components = Array.isArray(health.components) ? health.components.slice() : [];
if (!pawo.ok) {
  components.push({
    name: 'pawo_api',
    status: 'UNAVAILABLE',
    required: true,
    detail: safeCode(pawo.error_code, 'PAWO_API_UNREACHABLE'),
  });
}
components.push({
  name: 'n8n',
  status: Number(n8n.statusCode) === 200 ? 'OK' : 'UNAVAILABLE',
  required: true,
  detail: Number(n8n.statusCode) === 200 ? null : 'N8N_HEALTH_ENDPOINT',
});
components.push({
  name: 'telegram',
  status: telegram && telegram.error === undefined ? 'OK' : 'UNAVAILABLE',
  required: false,
  detail: telegram && telegram.error === undefined ? null : 'TELEGRAM_PROBE_FAILED',
});

const dead = Array.isArray((unresolved.response || {}).entries)
  ? unresolved.response.entries.length
  : 0;
const swept = ((sweep.response || {}).dead_lettered) || 0;
const rank = { OK: 0, NOT_PROBED: 0, NOT_CONFIGURED: 1, DEGRADED: 1, UNAVAILABLE: 2 };
let worst = 'OK';
for (const component of components) {
  const level = rank[component.status] === undefined ? 1 : rank[component.status];
  if (level > (rank[worst] === undefined ? 1 : rank[worst])) worst = component.status;
}
const status = worst === 'OK' ? 'OK' : worst === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'DEGRADED';
const slot = bucket(new Date().toISOString(), 15);
const failing = components.filter((c) => !['OK', 'NOT_PROBED'].includes(c.status));
return [
  {
    json: {
      status,
      escalate: status !== 'OK' || dead > 0,
      dead_letters: dead,
      swept,
      correlation_id: correlationId(null, `006-${slot}`),
      idempotency_key: idempotencyKey(['n8n-006', 'health', status, slot]),
      components,
      text: [
        `PAWO health: ${status} (__PAWO_ENVIRONMENT__)`,
        ...failing.map((c) => `- ${c.name}: ${c.status}${c.detail ? ` (${c.detail})` : ''}`),
        `- records awaiting recovery: ${dead}`,
        `- abandoned claims swept: ${swept}`,
      ].join('\n'),
    },
  },
];

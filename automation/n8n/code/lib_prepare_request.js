// LIB attempt step 1: build one authenticated PAWO request from a validated instruction.
// The host comes from deployment configuration and the path from the allowlist above, so no
// payload can redirect a request (SSRF guard).
const base = '__PAWO_API_BASE_URL__';
const input = $input.first().json;
const path = input.path;
if (!PAWO_PATHS.includes(path)) {
  throw new Error(`refusing to call a path outside the PAWO allowlist: ${String(path).slice(0, 80)}`);
}
const method = ['GET', 'POST'].includes(input.method) ? input.method : null;
if (!method) throw new Error('only GET and POST are used by PAWO automation');
const workflowId = input.workflow_id;
if (!/^N8N-(00[1-6]|ERR)$/.test(workflowId || '')) throw new Error('a PAWO workflow id is required');

const headers = { 'X-PAWO-Workflow-Id': workflowId, 'X-Correlation-ID': input.correlation_id };
if (input.idempotency_key) headers['Idempotency-Key'] = input.idempotency_key;

return [
  {
    json: {
      ...input,
      url: base + path + (input.query ? `?${input.query}` : ''),
      method,
      headers,
      has_body: method === 'POST' && !!input.body,
      body: input.body || {},
    },
  },
];

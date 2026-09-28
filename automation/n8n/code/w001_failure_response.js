// N8N-001: a typed failure response. It carries the PAWO error code and nothing else — no message
// text, no upstream body, no credential.
const item = $input.first().json;
const invalid = item.valid === false;
return [
  {
    json: {
      accepted: false,
      error: {
        code: invalid ? 'INVALID_INPUT' : safeCode(item.error_code, 'DEPENDENCY_UNAVAILABLE'),
        reason: invalid ? item.reason : null,
        classification: invalid ? 'permanent' : item.classification,
        correlation_id: item.correlation_id || null,
      },
      http_status: invalid ? 400 : item.http_status >= 400 ? item.http_status : 502,
    },
  },
];

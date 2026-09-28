// LIB call step 1: the state of the next attempt. Runs for the first attempt and every retry, so
// it reads only its own input and never another node's run.
const input = $input.first().json;
const attempt = Number(input.attempt || 0) + 1;
const maxAttempts = Math.min(Number(input.max_attempts || __PAWO_MAX_ATTEMPTS__), 10);
return [
  {
    json: {
      method: input.method,
      path: input.path,
      query: input.query || null,
      body: input.body || null,
      idempotency_key: input.idempotency_key || null,
      correlation_id: input.correlation_id,
      workflow_id: input.workflow_id,
      attempt,
      max_attempts: maxAttempts,
      // The caller's own state travels with the request and comes back with the result, so no
      // node inside the retry loop has to reach across to another node's run.
      state: input.state || null,
    },
  },
];

// LIB call step 4: the normalized result of the call, after any bounded retries.
const item = $input.first().json;
const retryable = item.classification === 'transient' && item.attempt < item.max_attempts;
return [
  {
    json: {
      ok: item.ok === true,
      http_status: item.http_status,
      classification: item.classification,
      error_code: item.error_code,
      error_details: item.error_details,
      attempts: item.attempt,
      exhausted: !item.ok && !retryable,
      correlation_id: item.correlation_id,
      idempotency_key: item.idempotency_key,
      path: item.path,
      response: item.response,
      state: item.state || null,
    },
  },
];

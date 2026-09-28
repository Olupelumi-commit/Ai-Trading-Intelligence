// LIB call step 3: whether to retry, and how long to wait. Bounded attempts, exponential backoff,
// and `Retry-After` honoured when PAWO or a provider sends one. Permanent and unknown outcomes are
// never retried.
const item = $input.first().json;
const retry = item.classification === 'transient' && item.attempt < item.max_attempts;
return [
  {
    json: {
      ...item,
      retry,
      backoff_seconds: retry
        ? backoffSeconds(item.attempt, __PAWO_BACKOFF_SECONDS__, 60, item.retry_after_seconds)
        : 0,
    },
  },
];

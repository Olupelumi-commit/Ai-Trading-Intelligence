// N8N-003 step 2: ask PAWO for the current state of the setup. The alert is never built from the
// webhook payload: an expired, invalidated or downgraded setup must not produce a notification.
const request = $input.first().json;
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/setups/verify',
      body: { symbol: request.symbol, setup_id: request.setup_id },
      correlation_id: request.correlation_id,
      workflow_id: 'N8N-003',
      setup_id: request.setup_id,
      symbol: request.symbol,
      event_id: request.event_id,
    },
  },
];

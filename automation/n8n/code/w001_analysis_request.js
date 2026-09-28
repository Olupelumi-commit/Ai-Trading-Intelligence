// N8N-001 step 2: the PAWO analysis call. The workflow sends the symbol and its keys only; every
// strategy input, threshold and decision belongs to PAWO.
const request = $input.first().json;
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/analyses',
      body: { symbol: request.symbol },
      idempotency_key: request.idempotency_key,
      correlation_id: request.correlation_id,
      workflow_id: 'N8N-001',
      event_id: request.event_id,
      setup_id: request.setup_id,
    },
  },
];

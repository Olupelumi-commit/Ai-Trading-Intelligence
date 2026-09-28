// N8N-002 step 1: the watchlist, batch size and pacing all come from PAWO.
return [
  {
    json: {
      method: 'GET',
      path: '/api/v1/automation/watchlist',
      correlation_id: correlationId(null, `002-${bucket(new Date().toISOString(), 15)}`),
      workflow_id: 'N8N-002',
    },
  },
];

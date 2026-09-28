// N8N-006: ask PAWO to dead-letter claims abandoned by a crashed execution.
const item = $input.first().json;
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/ledger/sweeps',
      correlation_id: item.correlation_id || correlationId(null, '006-sweep'),
      workflow_id: 'N8N-006',
    },
  },
];

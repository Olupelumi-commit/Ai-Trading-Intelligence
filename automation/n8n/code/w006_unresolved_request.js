// N8N-006: how many records await manual recovery.
const item = $input.first().json;
return [
  {
    json: {
      method: 'GET',
      path: '/api/v1/automation/ledger/unresolved',
      correlation_id: item.correlation_id || correlationId(null, '006-unresolved'),
      workflow_id: 'N8N-006',
    },
  },
];

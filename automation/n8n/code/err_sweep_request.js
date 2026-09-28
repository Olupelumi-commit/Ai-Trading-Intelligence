// Shared error handler: ask PAWO to dead-letter any claim the crashed execution abandoned, so the
// record ends up in the recovery list instead of staying claimed forever.
const item = $input.first().json;
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/ledger/sweeps',
      correlation_id: item.correlation_id,
      workflow_id: 'N8N-ERR',
      text: item.text,
      idempotency_key: item.idempotency_key,
      workflow_for_alert: item.failed_workflow,
    },
  },
];

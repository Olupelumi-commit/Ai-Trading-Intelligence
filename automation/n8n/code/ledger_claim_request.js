// Shared step: claim one delivery before an operational notification is sent, so a retried or
// re-scheduled execution cannot repeat it.
const item = $input.first().json;
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/ledger/claims',
      correlation_id: item.correlation_id,
      workflow_id: item.workflow_id || 'N8N-006',
      state: { text: item.text, workflow_id: item.workflow_id || 'N8N-006' },
      body: {
        idempotency_key: item.idempotency_key,
        workflow_id: item.workflow_id || 'N8N-006',
        operation: item.operation || 'HEALTH_ALERT',
        fingerprint: { key: item.idempotency_key, chat: '__PAWO_TELEGRAM_CHAT_ID__' },
      },
    },
  },
];

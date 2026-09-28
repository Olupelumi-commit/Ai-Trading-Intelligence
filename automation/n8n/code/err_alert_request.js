// Shared error handler: one operational notification per failed execution, claimed like any other
// delivery so a re-run cannot repeat it.
const item = $input.first().json;
const state = $('Safe failure record').first().json;
return [
  {
    json: {
      correlation_id: state.correlation_id,
      workflow_id: state.failed_workflow,
      operation: 'HEALTH_ALERT',
      idempotency_key: state.idempotency_key,
      text: state.text,
      swept: ((item.response || {}).dead_lettered) || 0,
    },
  },
];

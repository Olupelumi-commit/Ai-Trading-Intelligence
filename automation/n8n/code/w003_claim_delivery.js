// N8N-003 step 3: claim the one delivery for this setup. The key is the setup itself, so a repeated
// webhook, a retried execution and the scheduled scan all converge on a single notification.
const call = $input.first().json;
const verification = call.response || {};
const alertable = verification.alertable === true;
return [
  {
    json: {
      alertable,
      reason: verification.reason || safeCode(call.error_code, 'VERIFICATION_FAILED'),
      symbol: verification.symbol || call.symbol,
      setup_id: verification.setup_id || call.setup_id,
      notification: verification.notification || null,
      correlation_id: call.correlation_id,
      state: {
        setup_id: verification.setup_id || call.setup_id,
        symbol: verification.symbol || call.symbol,
        notification: verification.notification || null,
      },
      method: 'POST',
      path: '/api/v1/automation/ledger/claims',
      workflow_id: 'N8N-003',
      body: {
        idempotency_key: idempotencyKey(['n8n-003', 'alert', verification.setup_id || call.setup_id]),
        workflow_id: 'N8N-003',
        operation: 'ALERT_DELIVERY',
        event_id: call.event_id || undefined,
        fingerprint: {
          setup_id: verification.setup_id || call.setup_id,
          symbol: verification.symbol || call.symbol,
          chat: '__PAWO_TELEGRAM_CHAT_ID__',
        },
      },
    },
  },
];

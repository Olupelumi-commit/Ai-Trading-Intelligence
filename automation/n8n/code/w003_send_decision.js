// N8N-003 step 4: send only on a fresh claim. A duplicate or blocked claim means the notification
// was already delivered or ended for manual recovery, so nothing is sent again.
const item = $input.first().json;
const claim = item.response || {};
const entry = claim.entry || {};
const state = item.state || {};
const acquired = claim.disposition === 'ACQUIRED';
return [
  {
    json: {
      send: acquired && !!state.notification,
      disposition: claim.disposition || 'BLOCKED',
      claim_token: claim.claim_token || null,
      idempotency_key: entry.idempotency_key || null,
      correlation_id: item.correlation_id,
      setup_id: state.setup_id || null,
      symbol: state.symbol || null,
      text: state.notification ? plainText(state.notification.text) : null,
    },
  },
];

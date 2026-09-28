// Shared step: send only on a fresh claim.
const item = $input.first().json;
const claim = item.response || {};
const state = item.state || {};
return [
  {
    json: {
      send: claim.disposition === 'ACQUIRED',
      disposition: claim.disposition || 'BLOCKED',
      claim_token: claim.claim_token || null,
      idempotency_key: (claim.entry || {}).idempotency_key || null,
      correlation_id: item.correlation_id,
      workflow_id: state.workflow_id || null,
      text: plainText(state.text),
    },
  },
];

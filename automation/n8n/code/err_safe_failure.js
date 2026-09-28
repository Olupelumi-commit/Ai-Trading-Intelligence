// Shared error handler: reduce an unexpected workflow failure to a safe record. No stack trace,
// message text, URL, header or credential leaves this node.
const item = $input.first().json;
const execution = item.execution || {};
const workflow = item.workflow || {};
const name = String(workflow.name || '');
const matched = name.match(/PAWO-(N8N-00[1-6])/);
const message = String((execution.error || {}).message || '').toLowerCase();
const known = [
  ['timeout', 'WORKFLOW_TIMEOUT', 'transient'],
  ['socket', 'NETWORK_ERROR', 'transient'],
  ['econn', 'NETWORK_ERROR', 'transient'],
  ['getaddrinfo', 'NETWORK_ERROR', 'transient'],
  ['credential', 'CREDENTIAL_PROBLEM', 'permanent'],
  ['unauthorized', 'UNAUTHORIZED', 'permanent'],
  ['forbidden', 'FORBIDDEN', 'permanent'],
  ['allowlist', 'PATH_NOT_ALLOWED', 'permanent'],
];
const hit = known.find(([needle]) => message.includes(needle));
const slot = bucket(new Date().toISOString(), 15);
const executionRef = String(execution.id || slot).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || slot;
const workflowId = matched ? matched[1] : 'N8N-006';
return [
  {
    json: {
      method: 'POST',
      path: '/api/v1/automation/failures',
      correlation_id: correlationId(null, `err-${executionRef}`),
      workflow_id: 'N8N-ERR',
      failed_workflow: workflowId,
      error_code: hit ? hit[1] : 'WORKFLOW_FAILED',
      error_class: hit ? hit[2] : 'unknown',
      execution_ref: executionRef,
      idempotency_key: idempotencyKey(['n8n-err', workflowId, executionRef]),
      text: [
        `PAWO workflow failure (__PAWO_ENVIRONMENT__)`,
        `Workflow: ${workflowId}`,
        `Execution: ${executionRef}`,
        `Code: ${hit ? hit[1] : 'WORKFLOW_FAILED'} (${hit ? hit[2] : 'unknown'})`,
        `Node: ${String(execution.lastNodeExecuted || 'unknown').slice(0, 64)}`,
        'Recover through the PAWO ledger: unresolved records replay only through idempotency.',
      ].join('\n'),
      body: {
        workflow_id: workflowId,
        execution_ref: executionRef,
        error_class: hit ? hit[2] : 'unknown',
        error_code: hit ? hit[1] : 'WORKFLOW_FAILED',
      },
    },
  },
];

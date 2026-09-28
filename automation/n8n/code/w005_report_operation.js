// N8N-005: the delivery is claimed as a report delivery, once per report date.
const item = $input.first().json;
return [{ json: { ...item, workflow_id: 'N8N-005', operation: 'REPORT_DELIVERY' } }];

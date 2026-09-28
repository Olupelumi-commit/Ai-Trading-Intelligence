// N8N-005 step 1: yesterday's report, from PAWO's own aggregation.
const now = new Date();
const day = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
return [
  {
    json: {
      method: 'GET',
      path: '/api/v1/automation/reports/daily',
      query: `report_date=${day}`,
      report_date: day,
      correlation_id: correlationId(null, `005-${day}`),
      workflow_id: 'N8N-005',
    },
  },
];

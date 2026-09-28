// N8N-002 step 5: one item per setup PAWO marked alertable, so the alert workflow receives one
// request per setup. With none, this returns no items and the alert branch does not run.
const item = $input.first().json;
const alerts = Array.isArray(item.alerts) ? item.alerts : [];
return alerts.map((alert) => ({ json: alert }));

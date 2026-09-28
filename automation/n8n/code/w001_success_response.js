// N8N-001 step 4: the synchronous response. It reports the deterministic result and, separately,
// whether an AI interpretation was accepted. An AI failure never changes the analysis.
const item = $input.first().json;
const state = item.state || {};
// Either the interpretation branch ran (the analysis is in the call state) or it did not (the
// analysis is still on the item).
const analysis = state.analysis || item.analysis || {};
const summary = state.analysis_summary || item.analysis_summary || summaryOf(analysis);
const interpretation = item.response && item.response.outcome ? item.response : null;
return [
  {
    json: {
      accepted: true,
      correlation_id: item.correlation_id,
      analysis: analysis,
      summary: summary,
      interpretation: interpretation
        ? {
            outcome: interpretation.outcome,
            record_id: interpretation.record_id,
            available: interpretation.outcome === 'ACCEPTED',
          }
        : { outcome: null, record_id: null, available: false },
    },
  },
];

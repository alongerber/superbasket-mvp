export function collectionHealth(manifest, now = Date.now()) {
  const state = manifest.collector || {};
  const generated = Date.parse(manifest.generated_at);
  const started = Date.parse(state.started_at);
  let status = state.status || 'unknown';
  const seconds = Number(state.max_seconds) || 2400;
  if (status === 'running' && (!Number.isFinite(started) || now - started > (seconds + 1200) * 1000)) status = 'interrupted';
  const overdue = !Number.isFinite(generated) || generated > now + 300000 || now - generated > ((manifest.schedule_hours || 2) + 1) * 3600000;
  return {...state, status, refresh_overdue: overdue, age_minutes: Number.isFinite(generated) ? Math.max(0, Math.floor((now - generated) / 60000)) : null};
}

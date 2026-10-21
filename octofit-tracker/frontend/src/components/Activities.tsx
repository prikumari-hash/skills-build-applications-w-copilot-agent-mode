import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

function loadActivities() {
  return getJson<Record<string, unknown>>('/api/activities');
}

export default function Activities() {
  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      load={loadActivities}
      responseKey="activities"
      emptyMessage="No activities yet."
    />
  );
}

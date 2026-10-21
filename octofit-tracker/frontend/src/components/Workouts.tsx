import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

function loadWorkouts() {
  return getJson<Record<string, unknown>>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`);
}

export default function Workouts() {
  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      load={loadWorkouts}
      responseKey="suggestions"
      emptyMessage="No workout suggestions are available yet."
    />
  );
}

import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

function loadLeaderboard() {
  return getJson<Record<string, unknown>>('/api/leaderboard');
}

export default function Leaderboard() {
  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      load={loadLeaderboard}
      responseKey="leaderboard"
      emptyMessage="No leaderboard rankings yet."
    />
  );
}

import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

function loadTeams() {
  return getJson<Record<string, unknown>>('/api/teams');
}

export default function Teams() {
  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      load={loadTeams}
      responseKey="teams"
      emptyMessage="No teams yet."
    />
  );
}

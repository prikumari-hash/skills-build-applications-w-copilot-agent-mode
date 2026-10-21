import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  responseKey: string;
  emptyMessage: string;
};

type CapabilityState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; items: Record<string, unknown>[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function displayValue(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(displayValue).filter((item): item is string => item !== undefined).join(', ');
  }
  return undefined;
}

function labelFor(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

export function CapabilityCard({ title, description, endpoint, responseKey, emptyMessage }: Props) {
  const [state, setState] = useState<CapabilityState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const items = response[responseKey];
        if (!Array.isArray(items) || !items.every(isRecord)) {
          throw new Error(`Invalid ${responseKey} response`);
        }
        if (active) setState({ status: 'loaded', items });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [endpoint, responseKey]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}. Please try again.</p>}
        {state.status === 'loaded' && state.items.length === 0 && <p>{emptyMessage}</p>}
        {state.status === 'loaded' && state.items.length > 0 && (
          <ul>
            {state.items.map((item, index) => (
              <li key={String(item._id ?? index)}>
                {Object.entries(item)
                  .filter(([key]) => key !== '_id' && key !== '__v')
                  .map(([key, value]) => {
                    const display = displayValue(value);
                    return display ? <span className="me-2" key={key}>{labelFor(key)}: {display}</span> : null;
                  })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

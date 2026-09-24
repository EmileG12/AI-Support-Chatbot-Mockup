import { useEffect, useState } from "react";
import { getQueue, staffJoin } from "./api";
import type { QueueEntry, StaffJoinResponse } from "./types";

const POLL_INTERVAL_MS = 3000;

interface QueuePanelProps {
  onJoined: (conversationId: string, result: StaffJoinResponse) => void;
}

export function QueuePanel({ onJoined }: QueuePanelProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getQueue();
        if (!cancelled) setEntries(result);
      } catch (err) {
        console.error(err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleJoin(id: string) {
    setJoiningId(id);
    setError(null);
    try {
      const result = await staffJoin(id);
      onJoined(id, result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to join the conversation.");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="queue-panel">
      <h2>Live chat queue</h2>
      {error && <div className="error-banner">{error}</div>}
      {entries.length === 0 ? (
        <p className="queue-empty">No customers waiting.</p>
      ) : (
        <ul className="queue-list">
          {entries.map((entry) => (
            <li key={entry.id} className="queue-entry">
              <div className="queue-entry-info">
                <span className="queue-entry-name">{entry.customer_name ?? "Unknown customer"}</span>
                <span className="queue-entry-wait">
                  Est. wait: {entry.estimated_wait_minutes ?? "?"} min
                </span>
              </div>
              <button onClick={() => handleJoin(entry.id)} disabled={joiningId === entry.id}>
                {joiningId === entry.id ? "Joining…" : "Join"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

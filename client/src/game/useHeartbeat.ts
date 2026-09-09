import { useEffect } from 'react';
import { API, authHeaders } from './identity';

const INTERVAL_MS = 60_000;

export function useHeartbeat() {
  useEffect(() => {
    function beat() {
      fetch(`${API}/api/hub/heartbeat`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    }

    beat();
    const id = setInterval(beat, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}

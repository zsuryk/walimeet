export interface RememberedResponse {
  name: string;
  availabilities: Record<string, boolean>;
  savedAt: number;
}

function key(pollId: string): string {
  return `walimeet:mine:${pollId}`;
}

export function loadRememberedResponse(
  pollId: string
): RememberedResponse | null {
  try {
    const raw = localStorage.getItem(key(pollId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedResponse;
    if (typeof parsed?.name !== 'string' || !parsed.name.trim()) return null;
    if (typeof parsed?.availabilities !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRememberedResponse(
  pollId: string,
  data: { name: string; availabilities: Record<string, boolean> }
): void {
  try {
    localStorage.setItem(
      key(pollId),
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    // storage unavailable (private mode) — persistence is best-effort
  }
}

export function clearRememberedResponse(pollId: string): void {
  try {
    localStorage.removeItem(key(pollId));
  } catch {
    // ignore
  }
}

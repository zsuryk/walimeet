export interface CreateDraft {
  dates: string[];
  timeRange: { start: string; end: string };
  timezone: string;
  name: string;
  description: string;
  creatorName: string;
  expiryDays: number;
  step: number;
  savedAt: number;
}

const DRAFT_KEY = 'walimeet:createDraft';

export function loadCreateDraft(): CreateDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as CreateDraft;
    if (!Array.isArray(d.dates) || typeof d.name !== 'string') return null;
    return d;
  } catch {
    return null;
  }
}

export function saveCreateDraft(
  draft: Omit<CreateDraft, 'savedAt'>
): void {
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {
    // best-effort
  }
}

export function clearCreateDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

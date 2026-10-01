const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  theme: 'light' | 'dark' | 'auto';
  callback: (token: string) => void;
  'expired-callback': (token: string) => void;
}

interface TurnstileGlobal {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

const siteKey: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let loadPromise: Promise<void> | null = null;
let activeWidgetId: string | null = null;

export function isTurnstileEnabled(): boolean {
  return Boolean(siteKey);
}

export function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Turnstile'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function renderTurnstile(
  el: HTMLElement,
  onToken: (token: string | null) => void,
  action = 'submit'
): () => void {
  const key = siteKey;
  if (!key) return () => {};
  let disposed = false;
  let widgetId: string | null = null;

  void loadTurnstile()
    .catch(() => undefined)
    .then(() => {
      if (disposed || !window.turnstile) return;
      widgetId = window.turnstile.render(el, {
        sitekey: key,
        action,
        theme: 'auto',
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(null),
      });
      activeWidgetId = widgetId;
    });

  return () => {
    disposed = true;
    if (widgetId === null) return;
    if (activeWidgetId === widgetId) activeWidgetId = null;
    window.turnstile?.remove(widgetId);
  };
}

export function resetTurnstile(): void {
  if (activeWidgetId === null) return;
  window.turnstile?.reset(activeWidgetId);
}

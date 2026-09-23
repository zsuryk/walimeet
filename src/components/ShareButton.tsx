import { useState } from 'react';
import Button from './ui/Button';

interface ShareButtonProps {
  pollId: string;
}

export default function ShareButton({ pollId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canShare] = useState(() => typeof navigator.share === 'function');

  const shareUrl = `${window.location.origin}/poll/${pollId}`;

  const handleCopy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      ok = true;
    } catch {
      try {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        ok = document.execCommand('copy');
        document.body.removeChild(input);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setFailed(true);
    }
  };

  const handleClick = async () => {
    setFailed(false);
    if (canShare) {
      try {
        await navigator.share({ title: document.title, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopy();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        aria-label={copied ? undefined : canShare ? 'Share poll link' : 'Copy poll link'}
      >
        <span className="sr-only" role="status">
          {copied ? 'Link copied' : ''}
        </span>
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {canShare ? 'Share' : 'Copy link'}
          </>
        )}
      </Button>
      {failed && (
        <div className="w-full">
          <label
            htmlFor="share-url-manual"
            className="block text-xs text-gray-500"
          >
            Copy manually:
          </label>
          <input
            id="share-url-manual"
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="text-xs w-full mt-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
          />
        </div>
      )}
    </>
  );
}

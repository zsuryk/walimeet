import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import Button from './ui/Button';
import { inputClasses } from './ui/Field';
import { twMerge } from '../lib/cn';

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
            <Check className="w-4 h-4" aria-hidden="true" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" aria-hidden="true" />
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
            className={twMerge(inputClasses, 'text-xs mt-2')}
          />
        </div>
      )}
    </>
  );
}

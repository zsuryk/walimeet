import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Field, { inputClasses } from '../components/ui/Field';

export default function Home() {
  const navigate = useNavigate();
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const openPoll = () => {
    const input = linkInput.trim();
    let id: string | null = null;

    try {
      const url = new URL(input);
      const match = url.pathname.match(/\/poll\/([^/]+)/);
      if (match) id = match[1];
    } catch {
      if (/^[A-Za-z0-9_-]{5,}$/.test(input)) id = input;
    }

    if (!id) {
      setLinkError("That doesn't look like a poll link.");
      return;
    }

    setLinkError(null);
    navigate(`/poll/${id}`);
  };

  return (
    <div className="relative min-h-dvh flex flex-col px-4 py-12">
      <ThemeToggle />
      <div className="m-auto w-full max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Walimeet
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          The easiest way to schedule group meetings
        </p>

        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Have a link?
          </h2>
          <Field label="Paste a poll link" htmlFor="poll-link">
            <input
              id="poll-link"
              className={inputClasses}
              placeholder="https://…/poll/abc123 or just the ID"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openPoll();
              }}
            />
          </Field>
          <Button onClick={openPoll} className="mt-3 w-full">
            Open poll
          </Button>
          {linkError && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {linkError}
            </p>
          )}
        </Card>

        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1</span>
              </div>
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Pick dates</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the dates you'd like to meet
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2</span>
              </div>
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Share the link</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send the poll link to your group
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3</span>
              </div>
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Find the best time</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See everyone's availability at a glance
              </p>
            </div>
          </div>
        </Card>

        <Button size="lg" onClick={() => navigate('/create')}>
          Create a Poll
        </Button>
      </div>
    </div>
  );
}

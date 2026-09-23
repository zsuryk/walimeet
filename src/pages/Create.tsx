import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Calendar from '../components/Calendar';
import TimeRangePicker from '../components/TimeRangePicker';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Field, { inputClasses } from '../components/ui/Field';
import { createPoll } from '../lib/api';
import { getUserTimezone, getTimezoneOffset } from '../lib/timezone';
import {
  loadCreateDraft,
  saveCreateDraft,
  clearCreateDraft,
} from '../lib/createDraft';
import { format } from 'date-fns';

function parseDraftDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 1;
  return Math.min(3, Math.max(1, Math.round(step)));
}

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const draft = loadCreateDraft();
    return draft ? clampStep(draft.step) : 1;
  });
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    const draft = loadCreateDraft();
    return draft ? draft.dates.map(parseDraftDate) : [];
  });
  const [timeRange, setTimeRange] = useState(() => {
    const draft = loadCreateDraft();
    return draft?.timeRange ?? { start: '09:00', end: '17:00' };
  });
  const [timezone, setTimezone] = useState(() => {
    const draft = loadCreateDraft();
    return draft?.timezone ?? getUserTimezone();
  });
  const [name, setName] = useState(() => loadCreateDraft()?.name ?? '');
  const [description, setDescription] = useState(
    () => loadCreateDraft()?.description ?? ''
  );
  const [creatorName, setCreatorName] = useState(
    () => loadCreateDraft()?.creatorName ?? ''
  );
  const [expiryDays, setExpiryDays] = useState(
    () => loadCreateDraft()?.expiryDays ?? 7
  );
  const [draftRestored, setDraftRestored] = useState(
    () => loadCreateDraft() !== null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeRangeValid = timeRange.end > timeRange.start;
  const firstStepFocus = useRef(true);
  const firstSaveRef = useRef(true);

  useEffect(() => {
    if (firstStepFocus.current) {
      firstStepFocus.current = false;
      return;
    }
    document.getElementById('step-heading')?.focus();
  }, [step]);

  useEffect(() => {
    if (firstSaveRef.current) {
      firstSaveRef.current = false;
      return;
    }
    saveCreateDraft({
      dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
      timeRange,
      timezone,
      name,
      description,
      creatorName,
      expiryDays,
      step,
    });
  }, [
    selectedDates,
    timeRange,
    timezone,
    name,
    description,
    creatorName,
    expiryDays,
    step,
  ]);

  const startOver = () => {
    clearCreateDraft();
    setDraftRestored(false);
    setError(null);
    setStep(1);
    setSelectedDates([]);
    setTimeRange({ start: '09:00', end: '17:00' });
    setTimezone(getUserTimezone());
    setName('');
    setDescription('');
    setCreatorName('');
    setExpiryDays(7);
    firstSaveRef.current = true;
  };

  const goToStep = (next: number) => {
    setError(null);
    setStep(next);
  };

  const toggleDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => d.getTime() === date.getTime());
      if (exists) return prev.filter((d) => d.getTime() !== date.getTime());
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || selectedDates.length === 0) return;
    setError(null);
    setLoading(true);

    try {
      const poll = await createPoll({
        name,
        description,
        dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
        timeRange,
        timezone,
        creatorName: creatorName || 'Anonymous',
        expiryDays,
      });
      setError(null);
      clearCreateDraft();
      navigate(`/poll/${poll.id}?created=1`);
    } catch (err) {
      console.error('Failed to create poll:', err);
      setError('Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const userTz = getUserTimezone();
  const timezones = [
    'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles',
    'America/Denver', 'America/Chicago', 'America/New_York',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
    'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata',
    'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
    'Australia/Sydney', 'Pacific/Auckland',
  ];
  const allTimezones = [userTz, ...timezones.filter((tz) => tz !== userTz)];

  return (
    <div className="min-h-dvh py-8 px-4">
      <ThemeToggle />
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Walimeet
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Create a Poll
        </h1>

        {draftRestored && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-lg px-4 py-3 text-sm mb-6"
          >
            <span>We restored your unsaved poll draft.</span>
            <Button variant="ghost" size="sm" onClick={startOver}>
              Start over
            </Button>
          </div>
        )}

        {/* Progress */}
        <nav aria-label="Create poll progress">
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  aria-current={step === s ? 'step' : undefined}
                  aria-label={`Step ${s}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="sr-only">Step {step} of 3</span>
          </div>
          <div className="flex justify-center gap-8 mb-8">
            <span className={step === 1 ? 'text-xs text-indigo-600 dark:text-indigo-400 font-medium' : 'text-xs text-gray-500 dark:text-gray-400'}>
              Dates
            </span>
            <span className={step === 2 ? 'text-xs text-indigo-600 dark:text-indigo-400 font-medium' : 'text-xs text-gray-500 dark:text-gray-400'}>
              Times
            </span>
            <span className={step === 3 ? 'text-xs text-indigo-600 dark:text-indigo-400 font-medium' : 'text-xs text-gray-500 dark:text-gray-400'}>
              Details
            </span>
          </div>
        </nav>

        {/* Step 1: Pick dates */}
        {step === 1 && (
          <div className="space-y-4">
            <h2
              id="step-heading"
              tabIndex={-1}
              className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center"
            >
              What days would you like to meet?
            </h2>
            <Calendar selectedDates={selectedDates} onToggleDate={toggleDate} />
            {selectedDates.length > 0 && (
              <p role="status" className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {selectedDates.length} day{selectedDates.length === 1 ? '' : 's'} selected
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => goToStep(2)}
              disabled={selectedDates.length === 0}
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Time range & timezone */}
        {step === 2 && (
          <div className="space-y-6">
            <h2
              id="step-heading"
              tabIndex={-1}
              className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center"
            >
              What times would you like to meet between?
            </h2>
            <Card className="p-6">
              <TimeRangePicker
                start={timeRange.start}
                end={timeRange.end}
                onChange={setTimeRange}
              />
            </Card>
            <Card className="p-6">
              <Field
                label="Timezone"
                htmlFor="poll-timezone"
                hint="Everyone will see times in this timezone."
              >
                <select
                  id="poll-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  aria-describedby="poll-timezone-hint"
                  className={inputClasses}
                >
                  {allTimezones.map((tz, i) => (
                    <option key={tz} value={tz}>
                      {`${tz.replace(/_/g, ' ')} ${getTimezoneOffset(tz)}${i === 0 && tz === userTz ? ' (your timezone)' : ''}`}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => goToStep(1)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => goToStep(3)}
                disabled={!timeRangeValid}
                aria-describedby="time-range-error"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details & submit */}
        {step === 3 && (
          <div className="space-y-4">
            <h2
              id="step-heading"
              tabIndex={-1}
              className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center"
            >
              Name your meeting
            </h2>
            <Card className="p-6 space-y-4">
              <Field
                label="Meeting name *"
                htmlFor="poll-name"
                required
                hint={name ? undefined : 'Required — your meeting needs a name.'}
              >
                <input
                  id="poll-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team standup"
                  required
                  aria-required="true"
                  aria-describedby={name ? undefined : 'poll-name-hint'}
                  className={inputClasses}
                />
              </Field>
              <Field label="Description (optional)" htmlFor="poll-description">
                <textarea
                  id="poll-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the meeting about?"
                  rows={3}
                  className={inputClasses}
                />
              </Field>
              <Field
                label="Your name"
                htmlFor="poll-creator-name"
                hint="Leave blank to post as Anonymous."
              >
                <input
                  id="poll-creator-name"
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Anonymous"
                  aria-describedby="poll-creator-name-hint"
                  className={inputClasses}
                />
              </Field>
              <Field
                label="Expires in"
                htmlFor="poll-expiry"
                hint="After this many days the poll link stops working."
              >
                <select
                  id="poll-expiry"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  aria-describedby="poll-expiry-hint"
                  className={inputClasses}
                >
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                    <option key={d} value={d}>
                      {d} day{d > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>

            {/* Summary */}
            <Card className="p-6 text-sm">
              <p className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">Poll summary</p>
              <p className="text-indigo-700 dark:text-indigo-400">
                {selectedDates.length} day{selectedDates.length === 1 ? '' : 's'} · {timeRange.start} to {timeRange.end} · {timezone.replace(/_/g, ' ')}
              </p>
            </Card>

            {error && (
              <div
                role="alert"
                className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm"
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => goToStep(2)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!name.trim() || loading}
                aria-busy={loading}
              >
                {loading ? 'Creating...' : 'Create Poll'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

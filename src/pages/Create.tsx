import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Calendar from '../components/Calendar';
import TimeRangePicker from '../components/TimeRangePicker';
import ThemeToggle from '../components/ThemeToggle';
import { createPoll } from '../lib/api';
import { getUserTimezone, getTimezoneOffset } from '../lib/timezone';
import { format } from 'date-fns';

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '17:00' });
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const toggleDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => d.getTime() === date.getTime());
      if (exists) return prev.filter((d) => d.getTime() !== date.getTime());
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  const handleSubmit = async () => {
    if (!name || selectedDates.length === 0) return;
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
      navigate(`/poll/${poll.id}`);
    } catch (err) {
      console.error('Failed to create poll:', err);
      alert('Failed to create poll. Please try again.');
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
    <div className="min-h-screen py-8 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block">
          ← Walimeet
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Create a Poll
        </h1>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 ${
                    step > s ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Pick dates */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">
              What days would you like to meet?
            </h2>
            <Calendar selectedDates={selectedDates} onToggleDate={toggleDate} />
            {selectedDates.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {selectedDates.length} day(s) selected
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={selectedDates.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Time range & timezone */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">
              What times would you like to meet between?
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <TimeRangePicker
                start={timeRange.start}
                end={timeRange.end}
                onChange={setTimeRange}
              />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {allTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')} {getTimezoneOffset(tz)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details & submit */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">
              Name your meeting
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team standup"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's the meeting about?"
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires in
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                    <option key={d} value={d}>
                      {d} day{d > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-sm">
              <p className="font-medium text-green-800 dark:text-green-300 mb-1">Poll summary</p>
              <p className="text-green-700 dark:text-green-400">
                {selectedDates.length} day(s) · {timeRange.start} to {timeRange.end} · {timezone.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name || loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Poll'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

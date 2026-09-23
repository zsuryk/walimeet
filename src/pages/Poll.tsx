import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import TimeGrid from '../components/TimeGrid';
import ShareButton from '../components/ShareButton';
import ThemeToggle from '../components/ThemeToggle';
import { getPoll, respondToPoll } from '../lib/api';
import type { Poll as PollType } from '../lib/types';

export default function Poll() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<PollType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [myAvailabilities, setMyAvailabilities] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPoll(id)
      .then(setPoll)
      .catch(() => setError('Poll not found or expired'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggle = useCallback(
    (slotKey: string) => {
      setMyAvailabilities((prev) => ({
        ...prev,
        [slotKey]: !(prev[slotKey] ?? false),
      }));
    },
    []
  );

  // Load previous response when entering edit mode
  useEffect(() => {
    if (!isEditing || !poll) return;
    if (participantName.trim()) {
      const key = participantName.trim().toLowerCase();
      const existing = poll.responses[key];
      if (existing) {
        setMyAvailabilities({ ...existing.availabilities });
      }
    }
  }, [isEditing, poll, participantName]);

  const handleEnterEdit = () => {
    setMyAvailabilities({});
    setHoveredParticipant(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMyAvailabilities({});
    setParticipantName('');
  };

  const handleSubmit = async () => {
    if (!poll || !participantName.trim()) return;
    setSubmitting(true);

    try {
      const availableSlots: Record<string, boolean> = {};
      Object.entries(myAvailabilities).forEach(([key, value]) => {
        if (value) availableSlots[key] = true;
      });

      const updated = await respondToPoll(poll.id, {
        name: participantName.trim(),
        availabilities: availableSlots,
      });
      setPoll(updated);
      setIsEditing(false);
      setMyAvailabilities({});
      setParticipantName('');
    } catch (err) {
      console.error('Failed to submit:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading poll...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {error || 'Poll not found'}
        </h1>
        <Link
          to="/"
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 inline-block"
          >
            ← Walimeet
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{poll.name}</h1>
          {poll.description && (
            <p className="text-gray-600 dark:text-gray-300">{poll.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              📅 {poll.dates.length} day(s)
            </span>
            <span>
              🕐 {poll.timeRange.start} – {poll.timeRange.end}
            </span>
            <span>
              🌍 {poll.timezone.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Share & participant count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(poll.responses).length} response(s)
          </div>
          <ShareButton pollId={poll.id} />
        </div>

        {/* Time grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <TimeGrid
            dates={poll.dates}
            timeRange={poll.timeRange}
            slotMinutes={poll.slotMinutes}
            responses={poll.responses}
            onToggle={isEditing ? handleToggle : undefined}
            myAvailabilities={isEditing ? myAvailabilities : {}}
            hoveredParticipant={isEditing ? null : hoveredParticipant}
            onHoverParticipant={isEditing ? () => {} : setHoveredParticipant}
            isEditing={isEditing}
          />
        </div>

        {/* Display mode: Edit button */}
        {!isEditing && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <button
              type="button"
              onClick={handleEnterEdit}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Edit availability
            </button>
          </div>
        )}

        {/* Edit mode: Name input + Submit/Cancel */}
        {isEditing && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Submit your availability
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Your name"
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!participantName.trim() || submitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

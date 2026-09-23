import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import TimeGrid from '../components/TimeGrid';
import ShareButton from '../components/ShareButton';
import ThemeToggle from '../components/ThemeToggle';
import FilterButton from '../components/FilterButton';
import SubmitModal from '../components/SubmitModal';
import { getPoll, respondToPoll } from '../lib/api';
import type { Poll as PollType } from '../lib/types';

export default function Poll() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<PollType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [myAvailabilities, setMyAvailabilities] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);
  const [minParticipants, setMinParticipants] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getPoll(id)
      .then(setPoll)
      .catch(() => setError('Poll not found or expired'))
      .finally(() => setLoading(false));
  }, [id]);

  // Warn before closing/refreshing with unsaved changes
  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isEditing, hasChanges]);

  const handleSetSlots = useCallback(
    (slotKeys: string[], value: boolean) => {
      setMyAvailabilities((prev) => {
        const next = { ...prev };
        slotKeys.forEach((key) => {
          next[key] = value;
        });
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  const handleEnterEdit = () => {
    setMyAvailabilities({});
    setHoveredParticipant(null);
    setIsEditing(true);
    setHasChanges(false);
  };

  const handleEditButton = () => {
    if (isEditing) {
      if (hasChanges) {
        setShowSubmitModal(true);
      } else {
        // No changes, just exit edit mode
        setIsEditing(false);
        setMyAvailabilities({});
        setParticipantName('');
      }
    } else {
      handleEnterEdit();
    }
  };

  const handleCancelEdit = () => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setIsEditing(false);
    setHasChanges(false);
    setShowSubmitModal(false);
    setMyAvailabilities({});
    setParticipantName('');
  };

  const handleConfirmSubmit = async (name: string) => {
    if (!poll) return;
    setSubmitting(true);

    try {
      const availableSlots: Record<string, boolean> = {};
      Object.entries(myAvailabilities).forEach(([key, value]) => {
        if (value) availableSlots[key] = true;
      });

      const updated = await respondToPoll(poll.id, {
        name: name.trim(),
        availabilities: availableSlots,
      });
      setPoll(updated);
      setIsEditing(false);
      setHasChanges(false);
      setShowSubmitModal(false);
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
          className="text-indigo-600 hover:text-indigo-700 font-medium"
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

        {/* Edit/Submit, Share & participant count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(poll.responses).length} response(s)
            {isEditing && hasChanges && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                ● Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <FilterButton value={minParticipants} onChange={setMinParticipants} />
            <button
              type="button"
              onClick={handleEditButton}
              className={`font-semibold px-4 py-2 rounded-lg transition-colors text-sm ${
                isEditing
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isEditing ? (hasChanges ? 'Submit' : 'Cancel') : 'Edit availability'}
            </button>
            <ShareButton pollId={poll.id} />
          </div>
        </div>

        {/* Time grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <TimeGrid
            dates={poll.dates}
            timeRange={poll.timeRange}
            slotMinutes={poll.slotMinutes}
            responses={poll.responses}
            onSetSlots={isEditing ? handleSetSlots : undefined}
            myAvailabilities={isEditing ? myAvailabilities : {}}
            hoveredParticipant={isEditing ? null : hoveredParticipant}
            onHoverParticipant={isEditing ? () => {} : setHoveredParticipant}
            isEditing={isEditing}
            minParticipants={minParticipants}
          />
        </div>

        {/* Edit mode hint */}
        {isEditing && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-sm text-indigo-800 dark:text-indigo-200">
            💡 Click or drag on the grid to mark your available times, then press <strong>Submit</strong>.
          </div>
        )}
      </div>

      {/* Submit modal */}
      <SubmitModal
        isOpen={showSubmitModal}
        isSubmitting={submitting}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        defaultName={participantName}
        onNameChange={setParticipantName}
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FocusEvent } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Globe,
  Lightbulb,
  ArrowLeft,
  User,
  Check,
} from 'lucide-react';
import TimeGrid from '../components/TimeGrid';
import ShareButton from '../components/ShareButton';
import ThemeToggle from '../components/ThemeToggle';
import FilterButton from '../components/FilterButton';
import SubmitModal from '../components/SubmitModal';
import Button, {
  primaryLinkClasses,
} from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getPoll, respondToPoll, ApiError } from '../lib/api';
import type { ApiErrorKind } from '../lib/api';
import { formatTimeLabel, formatDayMonth } from '../lib/format';
import type { Poll as PollType, ParticipantResponse } from '../lib/types';

export default function Poll() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<PollType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editTargetKey, setEditTargetKey] = useState<string | null>(null);
  const [pendingEditKey, setPendingEditKey] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [myAvailabilities, setMyAvailabilities] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);
  const [minParticipants, setMinParticipants] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<{
    message: string;
    kind: ApiErrorKind | null;
  } | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [collisionName, setCollisionName] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [createdNudge, setCreatedNudge] = useState(
    () => searchParams.get('created') === '1'
  );
  const editButtonRef = useRef<HTMLSpanElement>(null);

  const loadPoll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPoll(id);
      setPoll(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError('Server error', null, 'server')
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  useEffect(() => {
    if (!createdNudge) return;
    const timer = setTimeout(() => {
      setCreatedNudge(false);
      setSearchParams({}, { replace: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [createdNudge, setSearchParams]);

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

  const resetEditState = () => {
    setEditTargetKey(null);
    setPendingEditKey(null);
    setConfirmDiscard(false);
    setShowSubmitModal(false);
    setCollisionName(null);
    setMyAvailabilities({});
    setParticipantName('');
    setSubmitError(null);
  };

  const loadResponseIntoEdit = (key: string, resp: ParticipantResponse) => {
    resetEditState();
    setHoveredParticipant(null);
    setSavedFlash(null);
    setIsEditing(true);
    setEditTargetKey(key);
    setParticipantName(resp.name);
    setMyAvailabilities({ ...resp.availabilities });
    setHasChanges(false);
  };

  const startEditFromKey = (key: string): boolean => {
    const resp = poll?.responses[key];
    if (!resp) return false;
    loadResponseIntoEdit(key, resp);
    return true;
  };

  const handleStartEdit = () => {
    resetEditState();
    setHoveredParticipant(null);
    setSavedFlash(null);
    setIsEditing(true);
    setHasChanges(false);
  };

  const handleEditParticipant = (key: string) => {
    if (!poll?.responses[key]) return;
    if (isEditing && hasChanges) {
      setPendingEditKey(key);
      setConfirmDiscard(true);
      return;
    }
    startEditFromKey(key);
  };

  const exitEdit = () => {
    setIsEditing(false);
    setHasChanges(false);
    resetEditState();
  };

  const handleDiscardChanges = () => {
    if (pendingEditKey && startEditFromKey(pendingEditKey)) return;
    exitEdit();
  };

  const handleCancelEdit = () => {
    if (hasChanges) {
      setPendingEditKey(null);
      setConfirmDiscard(true);
      return;
    }
    exitEdit();
  };

  const handleOpenSubmit = () => {
    if (!hasChanges) return;
    setSubmitError(null);
    setConfirmDiscard(false);
    setCollisionName(null);
    setShowSubmitModal(true);
  };

  const handleActionAreaFocus = (e: FocusEvent<HTMLSpanElement>) => {
    if (e.target !== e.currentTarget) return;
    const el =
      e.currentTarget.querySelector<HTMLButtonElement>(
        '[data-return-target]:not([disabled])'
      ) ??
      e.currentTarget.querySelector<HTMLButtonElement>('button:not([disabled])');
    el?.focus();
  };

  const performSubmit = async (name: string, token: string | null) => {
    if (!poll) return;
    setSubmitting(true);
    const wasEdit = editTargetKey !== null;

    try {
      const availableSlots: Record<string, boolean> = {};
      Object.entries(myAvailabilities).forEach(([key, value]) => {
        if (value) availableSlots[key] = true;
      });

      const input = { name: name.trim(), availabilities: availableSlots };
      const updated = token
        ? await respondToPoll(poll.id, input, token)
        : await respondToPoll(poll.id, input);
      setPoll(updated);
      exitEdit();
      setSavedFlash(
        wasEdit ? `Updated ${name.trim()}’s availability` : 'Saved'
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError({ message: err.message, kind: err.kind });
      } else {
        setSubmitError({
          message: 'Failed to submit. Please try again.',
          kind: null,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (name: string, token: string | null) => {
    if (!poll) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (editTargetKey) {
      await performSubmit(name, token);
      return;
    }

    const responseKey = trimmed.toLowerCase();
    if (Object.hasOwn(poll.responses, responseKey)) {
      setCollisionName(name);
      return;
    }

    await performSubmit(name, token);
  };

  const handleEditExisting = () => {
    if (!collisionName) return;
    const key = collisionName.trim().toLowerCase();
    if (!startEditFromKey(key)) setCollisionName(null);
  };

  const handleChangeName = () => {
    setCollisionName(null);
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <ThemeToggle />
        <div role="status" className="max-w-4xl mx-auto space-y-4 py-8">
          <span className="sr-only">Loading poll…</span>
          <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-64 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !poll) {
    const kind = error?.kind;
    return (
      <div className="min-h-dvh">
        <ThemeToggle />
        <div
          role="alert"
          className="min-h-dvh flex flex-col items-center justify-center px-4"
        >
          {kind === 'expired' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                This poll has expired
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                It&apos;s no longer accepting responses.
              </p>
              <Link
                to="/create"
                className={primaryLinkClasses('px-4 py-2 text-sm')}
              >
                Create a new poll
              </Link>
            </>
          ) : kind === 'network' ||
            kind === 'server' ||
            kind === 'bad-request' ||
            kind === 'rate-limited' ||
            kind === 'forbidden' ||
            kind === 'conflict' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Couldn&apos;t load poll
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {error?.message ?? 'Network error — check your connection'}
              </p>
              <Button onClick={loadPoll}>Retry</Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Poll not found or expired
              </h1>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const responseCount = Object.keys(poll.responses).length;
  const creatorDisplay = poll.creatorName?.trim() || 'Anonymous';
  const dayCount = poll.dates.length;
  const expiresAt = new Date(poll.expiresAt).getTime();
  const msUntilExpiry = expiresAt - Date.now();
  const showExpiry = msUntilExpiry > 0;
  const expirySoon = showExpiry && msUntilExpiry < 24 * 60 * 60 * 1000;
  const expiryText = formatDayMonth(new Date(poll.expiresAt));

  const statusBadge = hasChanges
    ? {
        text: 'Unsaved changes',
        cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
      }
    : {
        text: 'Editing',
        cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      };

  return (
    <div className="min-h-dvh py-8 px-4">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto">
        {createdNudge && (
          <div
            role="status"
            className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-xl px-4 py-3 text-sm mb-6"
          >
            Poll created — copy the link and invite your group.
          </div>
        )}

        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-brand-400 dark:hover:text-brand-300 mb-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Walimeet
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{poll.name}</h1>
          {poll.description && (
            <p className="text-gray-600 dark:text-gray-300">{poll.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4" aria-hidden="true" />
              Created by {creatorDisplay}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {dayCount} day{dayCount === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              {formatTimeLabel(poll.timeRange.start)} – {formatTimeLabel(poll.timeRange.end)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4" aria-hidden="true" />
              {poll.timezone.replace(/_/g, ' ')}
            </span>
            {showExpiry && (
              <span
                className={
                  expirySoon ? 'text-amber-700 dark:text-amber-400 font-medium' : undefined
                }
              >
                Expires {expiryText}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between mb-6 gap-y-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {responseCount} response{responseCount === 1 ? '' : 's'}
            {savedFlash && (
              <span role="status" className="ml-2 inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                <Check className="w-4 h-4" aria-hidden="true" />
                {savedFlash}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterButton value={minParticipants} onChange={setMinParticipants} />
            <span
              ref={editButtonRef}
              tabIndex={-1}
              onFocus={handleActionAreaFocus}
              className="inline-flex flex-wrap items-center gap-3 rounded-lg"
            >
              {!isEditing ? (
                <Button
                  variant="primary"
                  onClick={handleStartEdit}
                  data-return-target=""
                >
                  Add availability
                </Button>
              ) : (
                <>
                  <span
                    role="status"
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.cls}`}
                  >
                    {statusBadge.text}
                  </span>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleOpenSubmit}
                    disabled={!hasChanges}
                    data-return-target=""
                  >
                    Submit
                  </Button>
                </>
              )}
            </span>
            <span
              className={
                createdNudge
                  ? 'inline-flex rounded-lg ring-2 ring-brand-400 animate-pulse'
                  : 'contents'
              }
            >
              <ShareButton pollId={poll.id} />
            </span>
          </div>
        </div>

        {isEditing && confirmDiscard && (
          <div
            role="alertdialog"
            aria-label="Discard changes?"
            className="mb-6 flex flex-wrap items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm"
          >
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Discard changes?
            </span>
            <div className="flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={handleDiscardChanges}>
                Discard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirmDiscard(false);
                  setPendingEditKey(null);
                }}
              >
                Keep editing
              </Button>
            </div>
          </div>
        )}

        {responseCount === 0 && (
          <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center mb-6 text-sm text-gray-600 dark:text-gray-300">
            No responses yet — share the link, then add your own availability.
          </div>
        )}

        <Card className="p-4 mb-6">
          <TimeGrid
            dates={poll.dates}
            timeRange={poll.timeRange}
            slotMinutes={poll.slotMinutes}
            responses={poll.responses}
            onSetSlots={isEditing ? handleSetSlots : undefined}
            myAvailabilities={isEditing ? myAvailabilities : {}}
            hoveredParticipant={hoveredParticipant}
            onHoverParticipant={setHoveredParticipant}
            onEditParticipant={handleEditParticipant}
            isEditing={isEditing}
            minParticipants={minParticipants}
          />
        </Card>

        {isEditing && (
          <div
            role="status"
            className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-4 text-sm text-brand-800 dark:text-brand-200"
          >
            <span className="flex items-center gap-1.5 flex-wrap">
              <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Click, tap, or drag on the grid to mark your available times, then press{' '}
                <strong>Submit</strong>.
              </span>
            </span>
          </div>
        )}
      </div>

      <SubmitModal
        isOpen={showSubmitModal}
        isSubmitting={submitting}
        onClose={() => {
          setShowSubmitModal(false);
          setSubmitError(null);
          setCollisionName(null);
        }}
        onConfirm={handleConfirmSubmit}
        defaultName={participantName}
        onNameChange={setParticipantName}
        onCancelEdit={exitEdit}
        error={submitError?.message}
        errorKind={submitError?.kind}
        returnFocusRef={editButtonRef}
        collisionName={collisionName}
        onEditExisting={handleEditExisting}
        onChangeName={handleChangeName}
        editingName={
          collisionName || !editTargetKey ? null : participantName
        }
      />
    </div>
  );
}

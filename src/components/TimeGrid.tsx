import { useState, useCallback, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Check } from 'lucide-react';
import { generateTimeSlots } from '../lib/timezone';
import { formatTimeLabel } from '../lib/format';
import Button from './ui/Button';

interface TimeGridProps {
  dates: string[];
  timeRange: { start: string; end: string };
  slotMinutes: number;
  responses: Record<string, { name: string; availabilities: Record<string, boolean> }>;
  onSetSlots: ((slotKeys: string[], value: boolean) => void) | undefined;
  myAvailabilities: Record<string, boolean>;
  hoveredParticipant: string | null;
  onHoverParticipant: (name: string | null) => void;
  isEditing: boolean;
  minParticipants?: number | null;
}

type SlotColor = { cls: string } | { color: string };

function intensityColor(intensity: number, alpha: number): string {
  const hue = 231;
  const sat = 60 + intensity * 25;
  const light = 88 - intensity * 50;
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

export default function TimeGrid({
  dates,
  timeRange,
  slotMinutes,
  responses,
  onSetSlots,
  myAvailabilities,
  hoveredParticipant,
  onHoverParticipant,
  isEditing,
  minParticipants,
}: TimeGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<boolean | null>(null);
  const [focusPos, setFocusPos] = useState({ row: 0, col: 0 });
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const slots = generateTimeSlots(timeRange.start, timeRange.end, slotMinutes);

  const lensParticipant = hoveredParticipant ?? pinnedParticipant;

  const activeSlot = focusedSlot ?? hoveredSlot;

  const getSlotKey = (date: string, time: string) => `${date}-${time}`;

  const getAvailableCount = (slotKey: string) => {
    let count = 0;
    Object.values(responses).forEach((r) => {
      if (r.availabilities[slotKey]) count++;
    });
    return count;
  };

  const getAvailableNames = (slotKey: string): string[] => {
    const names: string[] = [];
    Object.values(responses).forEach((r) => {
      if (r.availabilities[slotKey]) names.push(r.name);
    });
    return names;
  };

  const participantCount = Object.keys(responses).length;

  const handlePointerDown = useCallback(
    (slotKey: string) => {
      if (!onSetSlots) return;
      const currentValue = myAvailabilities[slotKey] ?? false;
      const newValue = !currentValue;
      setDragValue(newValue);
      setIsDragging(true);
      onSetSlots([slotKey], newValue);
    },
    [myAvailabilities, onSetSlots]
  );

  const toggleSlot = useCallback(
    (slotKey: string) => {
      if (!onSetSlots) return;
      onSetSlots([slotKey], !(myAvailabilities[slotKey] ?? false));
    },
    [myAvailabilities, onSetSlots]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const key = el?.getAttribute('data-slot-key');
      if (key) setHoveredSlot((prev) => (prev === key ? prev : key));
      if (!onSetSlots || !isDragging || dragValue === null || !key) return;
      const currentValue = myAvailabilities[key] ?? false;
      if (currentValue !== dragValue) onSetSlots([key], dragValue);
    },
    [isDragging, dragValue, myAvailabilities, onSetSlots]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragValue(null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsDragging(false);
    setDragValue(null);
    setHoveredSlot(null);
  }, []);

  const moveFocus = (row: number, col: number) => {
    setFocusPos({ row, col });
    const key = getSlotKey(dates[col], slots[row]);
    cellRefs.current.get(key)?.focus();
  };

  const handleCellKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    slotKey: string,
    row: number,
    col: number
  ) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(Math.max(0, row - 1), col);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(Math.min(slots.length - 1, row + 1), col);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(row, Math.max(0, col - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(row, Math.min(dates.length - 1, col + 1));
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      if (onSetSlots) {
        e.preventDefault();
        toggleSlot(slotKey);
      }
    }
  };

  const formatDateLabel = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: dayNames[d.getDay()],
      date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
    };
  };

  const getSlotColor = (slotKey: string): SlotColor => {
    const isMyAvailable = myAvailabilities[slotKey] ?? false;
    const count = getAvailableCount(slotKey);
    const passesFilter = minParticipants == null || count >= minParticipants;

    if (lensParticipant) {
      const participant = responses[lensParticipant];
      const isAvailable = participant?.availabilities[slotKey] ?? false;
      if (!passesFilter) return { cls: 'bg-gray-100 dark:bg-gray-700' };
      return isAvailable
        ? { color: 'hsla(231, 84%, 56%, 0.6)' }
        : { cls: 'bg-gray-100 dark:bg-gray-700' };
    }

    if (!passesFilter) return { cls: 'bg-gray-100 dark:bg-gray-700' };

    if (isMyAvailable) return { color: 'hsla(231, 84%, 56%, 0.35)' };

    if (participantCount === 0 || count === 0) return { cls: '' };

    const intensity = count / participantCount;
    return { color: intensityColor(intensity, 0.25 + intensity * 0.55) };
  };

  const isSlotFilteredOut = (slotKey: string) => {
    if (minParticipants == null) return false;
    return getAvailableCount(slotKey) < minParticipants;
  };

  return (
    <div>
      {pinnedParticipant && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-900/40 px-3 py-2 text-sm text-brand-800 dark:text-brand-200">
          <span role="status">
            Viewing {responses[pinnedParticipant]?.name ?? pinnedParticipant}
            ’s availability
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPinnedParticipant(null)}
          >
            Stop viewing
          </Button>
        </div>
      )}

      {participantCount > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Participants ({participantCount})
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(responses).map(([entryKey, r]) => {
              const isPinned = pinnedParticipant === entryKey;
              const isLens = lensParticipant === entryKey;
              return (
                <Button
                  key={entryKey}
                  variant="secondary"
                  size="sm"
                  className={`min-h-11 py-2 rounded-full text-xs font-normal ${
                    isLens
                      ? 'bg-brand-500 dark:bg-brand-500 text-white dark:text-white hover:bg-brand-500 dark:hover:bg-brand-500'
                      : 'bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${isPinned ? 'ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-gray-800' : ''}`}
                  onFocus={() => onHoverParticipant(entryKey)}
                  onBlur={() => onHoverParticipant(null)}
                  onMouseEnter={() => onHoverParticipant(entryKey)}
                  onMouseLeave={() => onHoverParticipant(null)}
                  onClick={() =>
                    setPinnedParticipant((prev) =>
                      prev === entryKey ? null : entryKey
                    )
                  }
                  aria-pressed={isPinned}
                >
                  {r.name}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="overflow-x-auto"
        role="grid"
        aria-label="Availability by date and time"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
      >
        <div className="min-w-[600px]">
          <div
            role="row"
            className="grid border-b border-gray-300 dark:border-gray-600"
            style={{ gridTemplateColumns: `64px repeat(${dates.length}, 1fr)` }}
          >
            <div className="sticky left-0 z-10 bg-white dark:bg-gray-800" />
            {dates.map((date) => {
              const { day, date: dateStr } = formatDateLabel(date);
              return (
                <div
                  key={date}
                  role="columnheader"
                  className="flex-1 text-center px-1 py-2 border-l border-gray-300 dark:border-gray-600"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">{day}</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{dateStr}</div>
                </div>
              );
            })}
          </div>

          {slots.map((time, r) => (
            <div
              key={time}
              role="row"
              className="grid"
              style={{ gridTemplateColumns: `64px repeat(${dates.length}, 1fr)` }}
            >
              <div
                role="rowheader"
                className="sticky left-0 z-10 bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 pr-2 text-right border-b border-gray-200 dark:border-gray-700 flex items-center justify-end h-11"
              >
                {formatTimeLabel(time)}
              </div>
              {dates.map((date, c) => {
                const slotKey = getSlotKey(date, time);
                const count = getAvailableCount(slotKey);
                const slotColor = getSlotColor(slotKey);
                const backgroundColor = 'color' in slotColor ? slotColor.color : undefined;
                const bgCls = 'cls' in slotColor ? slotColor.cls : '';
                const isHovered = hoveredSlot === slotKey;
                const isMySelected = myAvailabilities[slotKey] ?? false;
                const showCount = participantCount > 0 && count > 0;
                const filteredOut = isSlotFilteredOut(slotKey);
                const { day, date: dateStr } = formatDateLabel(date);
                const availabilityText =
                  participantCount === 0
                    ? 'no responses yet'
                    : `${count} of ${participantCount} available`;

                return (
                  <button
                    key={slotKey}
                    type="button"
                    role="gridcell"
                    ref={(el) => {
                      if (el) cellRefs.current.set(slotKey, el);
                      else cellRefs.current.delete(slotKey);
                    }}
                    data-slot-key={slotKey}
                    data-my-selected={isMySelected ? 'true' : 'false'}
                    tabIndex={focusPos.row === r && focusPos.col === c ? 0 : -1}
                    aria-label={`${day} ${dateStr}, ${formatTimeLabel(time)}, ${availabilityText}`}
                    aria-selected={onSetSlots ? (myAvailabilities[slotKey] ?? false) : undefined}
                    className={`h-11 flex items-center justify-center border-l border-b border-gray-200 dark:border-gray-700 ${bgCls} ${isHovered ? 'ring-1 ring-inset ring-brand-400' : ''} ${isEditing ? 'cursor-pointer' : ''} ${filteredOut ? 'opacity-30' : ''} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500`}
                    style={{
                      touchAction: onSetSlots ? 'none' : undefined,
                      backgroundColor,
                    }}
                    onPointerDown={(e) => {
                      if (!onSetSlots) return;
                      e.preventDefault();
                      handlePointerDown(slotKey);
                    }}
                    onPointerEnter={() => setFocusedSlot(null)}
                    onKeyDown={(e) => handleCellKeyDown(e, slotKey, r, c)}
                    onFocus={() => {
                      setFocusPos({ row: r, col: c });
                      setFocusedSlot(slotKey);
                    }}
                    onBlur={() => setFocusedSlot(null)}
                    onClick={(e) => e.preventDefault()}
                  >
                    {(showCount || isMySelected) && (
                      <span className="pointer-events-none mx-auto my-auto flex items-center gap-0.5 rounded bg-white/90 dark:bg-gray-900/80 px-1.5 text-[10px] font-medium text-brand-800 dark:text-brand-100">
                        {isMySelected && (
                          <Check className="w-3 h-3" aria-hidden="true" />
                        )}
                        {showCount && <span>{count}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span>Less available</span>
        {[0, 0.33, 0.66, 1].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-3 w-6 rounded-sm border border-gray-200 dark:border-gray-700"
            style={{ backgroundColor: intensityColor(i, 0.25 + i * 0.55) }}
          />
        ))}
        <span>More available</span>
      </div>

      {activeSlot && !isEditing && (
        <div
          role="tooltip"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50 max-w-[min(24rem,calc(100vw-2rem))] whitespace-normal break-words"
        >
          {getAvailableNames(activeSlot).length > 0
            ? getAvailableNames(activeSlot).join(', ')
            : 'No one available'}
        </div>
      )}
    </div>
  );
}

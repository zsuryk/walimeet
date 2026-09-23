import { useState, useCallback, Fragment } from 'react';
import { generateTimeSlots } from '../lib/timezone';

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

// Blue-to-violet gradient based on intensity (0..1)
function intensityColor(intensity: number, alpha: number): string {
  // hue: 210 (blue) → 265 (violet)
  const hue = 210 + intensity * 55;
  const sat = 70 + intensity * 10;
  const light = 75 - intensity * 25;
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<boolean | null>(null);

  const slots = generateTimeSlots(timeRange.start, timeRange.end, slotMinutes);

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

  const handleMouseDown = useCallback(
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

  const handleMouseEnter = useCallback(
    (slotKey: string) => {
      setHoveredSlot(slotKey);
      if (!onSetSlots || !isDragging || dragValue === null) return;
      const currentValue = myAvailabilities[slotKey] ?? false;
      if (currentValue !== dragValue) {
        onSetSlots([slotKey], dragValue);
      }
    },
    [isDragging, dragValue, myAvailabilities, onSetSlots]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragValue(null);
  }, []);

  const formatTimeLabel = (time: string) => time;

  const formatDateLabel = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: dayNames[d.getDay()],
      date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
    };
  };

  const getSlotColor = (slotKey: string) => {
    const isMyAvailable = myAvailabilities[slotKey] ?? false;
    const count = getAvailableCount(slotKey);
    const passesFilter = minParticipants == null || count >= minParticipants;

    if (hoveredParticipant) {
      const participant = responses[hoveredParticipant];
      const isAvailable = participant?.availabilities[slotKey] ?? false;
      if (!passesFilter) return 'rgba(229, 231, 235, 0.3)';
      return isAvailable
        ? 'hsla(240, 80%, 55%, 0.6)'
        : 'rgba(229, 231, 235, 0.5)';
    }

    if (!passesFilter) return 'rgba(229, 231, 235, 0.3)';

    if (participantCount === 0) {
      return isMyAvailable ? 'hsla(240, 80%, 55%, 0.35)' : 'transparent';
    }

    if (count === 0) return 'transparent';

    const intensity = count / participantCount;
    return intensityColor(intensity, 0.25 + intensity * 0.55);
  };

  const isSlotFilteredOut = (slotKey: string) => {
    if (minParticipants == null) return false;
    return getAvailableCount(slotKey) < minParticipants;
  };

  return (
    <div
      className="overflow-x-auto"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[600px]">
        {/* Date headers */}
        <div className="flex border-b border-gray-300 dark:border-gray-600">
          <div className="w-16 shrink-0" />
          {dates.map((date) => {
            const { day, date: dateStr } = formatDateLabel(date);
            return (
              <div key={date} className="flex-1 text-center px-1 py-2 border-l border-gray-300 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400">{day}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{dateStr}</div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${dates.length}, 1fr)` }}>
          {slots.map((time) => (
            <Fragment key={time}>
              <div className="text-xs text-gray-500 dark:text-gray-400 pr-2 text-right py-0 border-b border-gray-200 dark:border-gray-700 flex items-start justify-end pt-0 h-8">
                {formatTimeLabel(time)}
              </div>
              {dates.map((date) => {
                const slotKey = getSlotKey(date, time);
                const count = getAvailableCount(slotKey);
                const bgColor = getSlotColor(slotKey);
                const isHovered = hoveredSlot === slotKey;
                const showCount = participantCount > 0 && count > 0;
                const filteredOut = isSlotFilteredOut(slotKey);

                return (
                  <div
                    key={slotKey}
                    className={`h-8 border-l border-b border-gray-200 dark:border-gray-700 ${isHovered ? 'ring-1 ring-inset ring-indigo-400' : ''} ${isEditing ? 'cursor-pointer' : ''} ${filteredOut ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: bgColor }}
                    onMouseEnter={() => handleMouseEnter(slotKey)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown(slotKey);
                    }}
                  >
                    {showCount && (
                      <span className="flex items-center justify-center h-full text-[10px] font-medium text-indigo-900 dark:text-indigo-100">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>

        {/* Participant list */}
        {participantCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Participants ({participantCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.values(responses).map((r) => (
                <span
                  key={r.name}
                  className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                    hoveredParticipant === r.name
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  onMouseEnter={() => onHoverParticipant(r.name)}
                  onMouseLeave={() => onHoverParticipant(null)}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tooltip */}
        {hoveredSlot && !isEditing && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
            {getAvailableNames(hoveredSlot).length > 0
              ? getAvailableNames(hoveredSlot).join(', ')
              : 'No one available'}
          </div>
        )}
      </div>
    </div>
  );
}

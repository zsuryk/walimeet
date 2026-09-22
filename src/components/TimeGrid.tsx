import { useState, useCallback } from 'react';
import { generateTimeSlots } from '../lib/timezone';

interface TimeGridProps {
  dates: string[];
  timeRange: { start: string; end: string };
  slotMinutes: number;
  responses: Record<string, { name: string; availabilities: Record<string, boolean> }>;
  onToggle: (slotKey: string) => void;
  myAvailabilities: Record<string, boolean>;
}

export default function TimeGrid({
  dates,
  timeRange,
  slotMinutes,
  responses,
  onToggle,
  myAvailabilities,
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

  const getIntensity = (slotKey: string) => {
    const count = getAvailableCount(slotKey);
    const participantCount = Object.keys(responses).length;
    if (participantCount === 0) return 0;
    return count / participantCount;
  };

  const handleMouseDown = useCallback(
    (slotKey: string) => {
      const currentValue = myAvailabilities[slotKey] ?? true;
      const newValue = !currentValue;
      setDragValue(newValue);
      setIsDragging(true);
      onToggle(slotKey);
    },
    [myAvailabilities, onToggle]
  );

  const handleMouseEnter = useCallback(
    (slotKey: string) => {
      setHoveredSlot(slotKey);
      if (isDragging && dragValue !== null) {
        const currentValue = myAvailabilities[slotKey] ?? true;
        if (currentValue !== dragValue) {
          onToggle(slotKey);
        }
      }
    },
    [isDragging, dragValue, myAvailabilities, onToggle]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragValue(null);
  }, []);

  const formatTimeLabel = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
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

  return (
    <div
      className="overflow-x-auto"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[600px]">
        {/* Date headers */}
        <div className="flex border-b border-gray-200 pb-2 mb-2">
          <div className="w-20 shrink-0" />
          {dates.map((date) => {
            const { day, date: dateStr } = formatDateLabel(date);
            return (
              <div key={date} className="flex-1 text-center px-1">
                <div className="text-xs text-gray-500">{day}</div>
                <div className="text-sm font-medium text-gray-800">{dateStr}</div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="space-y-1">
          {slots.map((time) => (
            <div key={time} className="flex items-center">
              <div className="w-20 shrink-0 text-xs text-gray-500 pr-2 text-right">
                {formatTimeLabel(time)}
              </div>
              {dates.map((date) => {
                const slotKey = getSlotKey(date, time);
                const isAvailable = myAvailabilities[slotKey] ?? true;
                const intensity = getIntensity(slotKey);
                const count = getAvailableCount(slotKey);
                const isHovered = hoveredSlot === slotKey;

                return (
                  <div
                    key={slotKey}
                    className="flex-1 px-0.5"
                    onMouseEnter={() => handleMouseEnter(slotKey)}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(slotKey);
                      }}
                      className={`
                        w-full h-8 rounded-sm text-xs font-medium transition-colors relative
                        ${isAvailable
                          ? `bg-green-${Math.max(100, Math.round(intensity * 500))} text-green-900`
                          : 'bg-gray-100 text-gray-400'
                        }
                        ${isHovered ? 'ring-2 ring-green-400' : ''}
                      `}
                      style={{
                        backgroundColor: isAvailable
                          ? `rgba(34, 197, 94, ${0.15 + intensity * 0.7})`
                          : undefined,
                      }}
                    >
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Participant list */}
        {Object.keys(responses).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Participants ({Object.keys(responses).length})
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.values(responses).map((r) => (
                <span
                  key={r.name}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tooltip */}
        {hoveredSlot && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
            {getAvailableNames(hoveredSlot).length > 0
              ? getAvailableNames(hoveredSlot).join(', ')
              : 'No one available'}
          </div>
        )}
      </div>
    </div>
  );
}

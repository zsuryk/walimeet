import { formatTimeLabel } from '../lib/format';

interface TimeRangePickerProps {
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
}

const TIMES = Array.from({ length: 96 }, (_, i) =>
  `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
);

export default function TimeRangePicker({
  start,
  end,
  onChange,
}: TimeRangePickerProps) {
  const valid = end > start;
  const selectClass =
    'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <label
          htmlFor="time-from"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          From
        </label>
        <select
          id="time-from"
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end })}
          className={selectClass}
        >
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {formatTimeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label
          htmlFor="time-to"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          To
        </label>
        <select
          id="time-to"
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value })}
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : 'time-range-error'}
          className={selectClass}
        >
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {formatTimeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      {!valid && (
        <p
          id="time-range-error"
          className="text-sm text-red-600 dark:text-red-400 sm:flex-1"
        >
          End time must be after start time.
        </p>
      )}
    </div>
  );
}

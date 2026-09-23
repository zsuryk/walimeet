import { formatTimeLabel } from '../lib/format';
import { inputClasses, labelClasses } from './ui/Field';

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <label htmlFor="time-from" className={labelClasses}>
          From
        </label>
        <select
          id="time-from"
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end })}
          className={inputClasses}
        >
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {formatTimeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label htmlFor="time-to" className={labelClasses}>
          To
        </label>
        <select
          id="time-to"
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value })}
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : 'time-range-error'}
          className={inputClasses}
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

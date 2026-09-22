interface TimeRangePickerProps {
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
);

export default function TimeRangePicker({
  start,
  end,
  onChange,
}: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From
        </label>
        <select
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          To
        </label>
        <select
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

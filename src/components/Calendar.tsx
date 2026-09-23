import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

interface CalendarProps {
  selectedDates: Date[];
  onToggleDate: (date: Date) => void;
}

export default function Calendar({ selectedDates, onToggleDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isSelected = (date: Date) =>
    selectedDates.some((d) => isSameDay(d, date));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          ←
        </button>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = isSelected(day);
          const past = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth || past}
              onClick={() => onToggleDate(day)}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-colors
                ${!inMonth ? 'text-gray-300 dark:text-gray-600 cursor-default' : ''}
                ${past && inMonth ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                ${!past && inMonth && !selected ? 'hover:bg-green-100 dark:hover:bg-green-900/50 text-gray-700 dark:text-gray-200' : ''}
                ${selected ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                ${today && !selected ? 'ring-2 ring-green-300 dark:ring-green-700' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

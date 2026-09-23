import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import Button from './ui/Button';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      className="fixed top-4 right-4 z-30 min-h-11 min-w-11 p-2 text-inherit dark:text-inherit"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </Button>
  );
}

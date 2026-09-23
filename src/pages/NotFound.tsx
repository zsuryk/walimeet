import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { primaryLinkClasses } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="relative min-h-dvh flex flex-col px-4 py-12">
      <ThemeToggle />
      <div className="m-auto text-center">
        <p aria-hidden="true" className="text-6xl font-bold text-gray-400 dark:text-gray-500 mb-4">
          404
        </p>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Check the link, or create a new poll.
        </p>
        <Link
          to="/create"
          className={primaryLinkClasses('min-h-11 px-6 py-3')}
        >
          Create a new poll
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Poll not found
      </h2>
      <p className="text-gray-500 mb-8">
        This poll may have expired or the link is invalid.
      </p>
      <Link
        to="/"
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        Create a new poll
      </Link>
    </div>
  );
}

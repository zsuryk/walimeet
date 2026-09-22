import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Walimeet
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The easiest way to schedule group meetings
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">1</span>
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Pick dates</h3>
              <p className="text-sm text-gray-500">
                Select the dates you'd like to meet
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">2</span>
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Share the link</h3>
              <p className="text-sm text-gray-500">
                Send the poll link to your group
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">3</span>
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Find the best time</h3>
              <p className="text-sm text-gray-500">
                See everyone's availability at a glance
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/create"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Create a Poll
        </Link>
      </div>
    </div>
  );
}

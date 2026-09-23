import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import Home from './pages/Home';
import Create from './pages/Create';
import Poll from './pages/Poll';
import NotFound from './pages/NotFound';

function TitleAndFocus() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const { pathname } = location;
    let title = 'Page not found – Walimeet';
    if (pathname === '/') title = 'Walimeet – Group Scheduling';
    else if (pathname === '/create') title = 'Create a Poll – Walimeet';
    else if (pathname.startsWith('/poll/')) title = 'Poll – Walimeet';
    document.title = title;

    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      document.getElementById('main')?.focus();
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>
        <TitleAndFocus />
        <div className="min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <main id="main" tabIndex={-1} className="focus:outline-none">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/poll/:id" element={<Poll />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

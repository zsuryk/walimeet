import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Create from './pages/Create';
import Poll from './pages/Poll';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/poll/:id" element={<Poll />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

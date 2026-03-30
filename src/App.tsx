import { HashRouter, Routes, Route } from 'react-router-dom';
import Analyse from './pages/Analyse';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/analyse" element={<Analyse />} />
        {/* <Route path="/" element={<Home />} /> */}
      </Routes>
    </HashRouter>
  );
}

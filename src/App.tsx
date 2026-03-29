import { HashRouter, Routes, Route } from 'react-router-dom';
import Analyse from './pages/Analyse';
// import Home from './pages/Home';       // add other pages here as you migrate them
// import OtherPage from './pages/OtherPage';

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

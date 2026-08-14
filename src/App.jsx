import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import AnimeDetails from './pages/AnimeDetails/AnimeDetails';
import Watch from './pages/Watch/Watch';
import Profile from './pages/Profile/Profile';
import Catalog from './pages/Catalog/Catalog';
import './App.css';

import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import Login from './pages/Login/Login';
import SecretZone from './pages/SecretZone/SecretZone';

function App() {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch');

  return (
    <AuthProvider>
      <UIProvider>
        <Navbar />
        <main className={`${isWatchPage ? 'watch-page-container' : 'container'} animate-fade-in`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/watch/:id/:episode" element={<Watch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/secret" element={<SecretZone />} />
          </Routes>
        </main>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

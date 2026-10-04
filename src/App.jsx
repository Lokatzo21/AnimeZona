import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import DataRepairer from './components/DataRepairer';
import Home from './pages/Home/Home';
import AnimeDetails from './pages/AnimeDetails/AnimeDetails';
import Watch from './pages/Watch/Watch';
import Profile from './pages/Profile/Profile';
import Catalog from './pages/Catalog/Catalog';
import SecretZone from './pages/SecretZone/SecretZone';
import Admin from './pages/Admin/Admin';
import './App.css';

import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import Login from './pages/Login/Login';
import Movies from './pages/Movies/Movies';
import MovieWatch from './pages/MovieWatch/MovieWatch';

function App() {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch') || location.pathname.startsWith('/movie-watch');
  const isHomePage = location.pathname === '/';

  return (
    <AuthProvider>
      <UIProvider>
        <DataRepairer />
        <Navbar />
        <main className={`${isWatchPage ? 'watch-page-container' : isHomePage ? 'home-page-container' : 'container'} animate-fade-in`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/watch/:id/:episode" element={<Watch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/secret" element={<SecretZone />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/movie-watch" element={<MovieWatch />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

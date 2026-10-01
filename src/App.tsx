import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PeoplePage from './pages/PeoplePage';
import PersonProfilePage from './pages/PersonProfilePage';
import AgentDatePage from './pages/AgentDatePage';
import RankingsPage from './pages/RankingsPage';
import DemoPage from './pages/DemoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/people" replace />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:id" element={<PersonProfilePage />} />
          <Route path="/date/:personA/:personB" element={<AgentDatePage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<Navigate to="/people" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { FullPageSpinner } from './components/ui/Spinner';
import { useAuth } from './context/AuthContext';
import ComposePage from './pages/ComposePage';
import DashboardLayout from './pages/DashboardLayout';
import EmailDetailPage from './pages/EmailDetailPage';
import EmailListPage from './pages/EmailListPage';
import LoginPage from './pages/LoginPage';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><DashboardLayout /></Protected>}>
        <Route path="/scheduled" element={<EmailListPage mode="scheduled" />} />
        <Route path="/sent" element={<EmailListPage mode="sent" />} />
      </Route>
      <Route path="/compose" element={<Protected><ComposePage /></Protected>} />
      <Route path="/email/:id" element={<Protected><EmailDetailPage /></Protected>} />
      <Route path="*" element={<Navigate to="/scheduled" replace />} />
    </Routes>
  );
}

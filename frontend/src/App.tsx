import { DashboardPage } from '@/pages/DashboardPage';
import { AuthPage } from '@/pages/AuthPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LandingPage } from '@/pages/LandingPage';
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/RouteGuards';

function App() {
  switch (window.location.pathname) {
    case '/':
      return <LandingPage />;
    case '/auth':
      return <PublicOnlyRoute><AuthPage /></PublicOnlyRoute>;
    case '/dashboard':
      return <ProtectedRoute><DashboardPage /></ProtectedRoute>;
    case '/analytics':
      return <ProtectedRoute><AnalyticsPage /></ProtectedRoute>;
    case '/profile':
      return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
    case '/settings':
      return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
    default:
      return <LandingPage />;
  }
}

export default App;

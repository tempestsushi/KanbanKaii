import { DashboardPage } from '@/pages/DashboardPage';
import { AuthPage } from '@/pages/AuthPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/RouteGuards';

function App() {
  switch (window.location.pathname) {
    case '/auth':
      return <PublicOnlyRoute><AuthPage /></PublicOnlyRoute>;
    case '/analytics':
      return <ProtectedRoute><AnalyticsPage /></ProtectedRoute>;
    case '/profile':
      return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
    case '/settings':
      return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
    default:
      return <ProtectedRoute><DashboardPage /></ProtectedRoute>;
  }
}

export default App;

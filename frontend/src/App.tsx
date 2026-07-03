import { lazy, Suspense } from 'react';
import { LandingPage } from '@/pages/LandingPage';

const AuthenticatedApp = lazy(() => import('@/auth/AuthenticatedApp'));

function App() {
  if (window.location.pathname === '/') return <LandingPage />;

  return (
    <Suspense fallback={<div className="min-h-screen bg-violet-50" />}>
      <AuthenticatedApp />
    </Suspense>
  );
}

export default App;

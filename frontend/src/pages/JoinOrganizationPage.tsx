import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { acceptOrganizationInvite } from '@/api/organizations';
import { Button } from '@/components/ui/button';

export function JoinOrganizationPage() {
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const token = decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] ?? '');
  const returnPath = `${window.location.pathname}${window.location.search}`;

  const join = async () => {
    setIsJoining(true);
    setError(null);
    try {
      await acceptOrganizationInvite(token);
      window.location.replace('/organization');
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join the organization');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-7 text-center shadow-xl">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-violet-600 text-xl font-black text-white">K</span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Join your organization</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Accept this invitation to access your organization and assigned work in KanbanKaii.</p>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-slate-500">Checking your account…</p>
          ) : user ? (
            <Button className="w-full" disabled={isJoining || token.length < 32} onClick={() => void join()}>{isJoining ? 'Joining…' : 'Accept invitation'}</Button>
          ) : (
            <a className="inline-flex w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700" href={`/auth?redirect=${encodeURIComponent(returnPath)}`}>Sign in or create an account</a>
          )}
        </div>
        <a href="/" className="mt-5 inline-block text-xs font-semibold text-violet-600 hover:text-violet-800">Back to home</a>
      </section>
    </main>
  );
}

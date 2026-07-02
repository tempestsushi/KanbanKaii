import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseClient } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          window.location.assign('/');
          return;
        }

        setNotice('Account created. Check your email to confirm your account.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      window.location.assign('/');
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Authentication failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <main className="min-h-screen overflow-auto bg-violet-100 px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-violet-600 p-10 text-white lg:flex">
          <div>
            <div className="mb-12 inline-flex rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">
              AI Ticket Board
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">
              Turn conversations into organized work.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-violet-100">
              Capture actionable messages, prioritize them with local AI, and
              manage every task from one private Kanban board.
            </p>
          </div>
          <p className="text-xs text-violet-200">Private workspace · Supabase Auth</p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                {isSignup ? 'Create workspace' : 'Welcome back'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {isSignup ? 'Create your account' : 'Sign in to your board'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isSignup
                  ? 'Your account receives its own private ticket workspace.'
                  : 'Use the email and password connected to your workspace.'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              {(['login', 'signup'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchMode(item)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    mode === item
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={submit}>
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Aisha Khan"
                    required
                    maxLength={100}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </div>

              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {notice}
                </p>
              )}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Please wait…'
                  : isSignup
                    ? 'Create account'
                    : 'Sign in'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

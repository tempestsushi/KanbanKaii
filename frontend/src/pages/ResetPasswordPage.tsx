import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/auth/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

export function ResetPasswordPage() {
  const { user, isLoading, configurationError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      window.location.replace('/dashboard');
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update your password. Request a new recovery link.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const recoveryUnavailable = !isLoading && (!user || Boolean(configurationError));

  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-6 shadow-xl sm:p-8">
        <a href="/" className="text-sm font-semibold text-violet-600 hover:text-violet-800">
          ← Back to home
        </a>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
          Account recovery
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use at least six characters and choose something you do not reuse elsewhere.
        </p>

        {isLoading && (
          <p className="mt-6 rounded-md bg-violet-50 px-3 py-3 text-sm text-violet-700">
            Verifying your recovery link…
          </p>
        )}

        {recoveryUnavailable && (
          <div className="mt-6 rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
            This recovery link is invalid or has expired.{' '}
            <a href="/auth" className="font-semibold underline">Request another link</a>.
          </div>
        )}

        {!isLoading && user && !configurationError && (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

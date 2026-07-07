import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useAuthPageForm } from '@/hooks/auth/useAuthPageForm';

type AuthFormPanelProps = ReturnType<typeof useAuthPageForm>;

export function AuthFormPanel({
  confirmPassword,
  displayName,
  email,
  error,
  isForgot,
  isSignup,
  isSubmitting,
  mode,
  notice,
  password,
  setConfirmPassword,
  setDisplayName,
  setEmail,
  setPassword,
  submit,
  switchMode,
}: AuthFormPanelProps) {
  return (
    <section className="flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            {isForgot ? 'Account recovery' : isSignup ? 'Create workspace' : 'Welcome back'}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {isForgot ? 'Reset your password' : isSignup ? 'Create your account' : 'Sign in to your board'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isForgot
              ? 'Enter your email and we will send you a secure recovery link.'
              : isSignup
                ? 'Your account receives its own private ticket workspace.'
                : 'Use the email and password connected to your workspace.'}
          </p>
        </div>

        {!isForgot && (
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
        )}

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

          {!isForgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
          )}

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
              : isForgot
                ? 'Send reset link'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
          </Button>

          {isForgot && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

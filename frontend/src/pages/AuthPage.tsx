import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';
import { useAuthPageForm } from '@/hooks/auth/useAuthPageForm';

export function AuthPage() {
  const authForm = useAuthPageForm();

  return (
    <main className="kanbankaii-app-grid relative min-h-dvh overflow-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-violet-300/45 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-8rem] top-0 h-96 w-96 rounded-full bg-indigo-200/55 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-fuchsia-200/35 blur-3xl" aria-hidden="true" />
      <a
        href="/"
        className="absolute left-4 top-5 z-10 inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white/75 px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/60 backdrop-blur-xl transition hover:bg-white hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-100 sm:left-6"
      >
        <span aria-hidden="true">←</span>
        Back to home
      </a>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-6rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 shadow-2xl shadow-violet-200/45 backdrop-blur-xl ring-1 ring-violet-100/70 lg:grid-cols-[1.05fr_0.95fr]">
        <AuthBrandPanel />
        <AuthFormPanel {...authForm} />
      </div>
    </main>
  );
}

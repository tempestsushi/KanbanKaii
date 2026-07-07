import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';
import { useAuthPageForm } from '@/hooks/auth/useAuthPageForm';

export function AuthPage() {
  const authForm = useAuthPageForm();

  return (
    <main className="relative min-h-screen overflow-auto bg-violet-100 px-4 pb-8 pt-16 sm:px-6">
      <a
        href="/"
        className="absolute left-4 top-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-white/70 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-100 sm:left-6"
      >
        <span aria-hidden="true">←</span>
        Back to home
      </a>

      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-5xl overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <AuthBrandPanel />
        <AuthFormPanel {...authForm} />
      </div>
    </main>
  );
}

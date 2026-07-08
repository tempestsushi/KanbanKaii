import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Check from 'lucide-react/dist/esm/icons/check';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';

const features = [
  {
    number: '01',
    title: 'Connect your workspace',
    description: 'Link Slack from Settings with a secure, account-specific OAuth connection.',
  },
  {
    number: '02',
    title: 'Let AI find the work',
    description: 'Local AI separates actionable requests from questions, chatter, and empty mentions.',
  },
  {
    number: '03',
    title: 'Move work forward',
    description: 'Tickets arrive in real time, ready to edit, prioritize, assign, and drag across your board.',
  },
];

const benefits = [
  'Private workspaces backed by Supabase',
  'Structured tasks instead of copied conversations',
  'Realtime updates from Slack to your board',
];

export function LandingPage() {
  const workspaceHref = '/auth?mode=signup';
  const workspaceLabel = 'Start for free';

  return (
    <main className="landing-scroll h-screen overflow-y-auto bg-[#f7f7fb] text-slate-950">
      <div className="relative overflow-hidden">
        <div className="landing-grid absolute inset-0 opacity-55" aria-hidden="true" />
        <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" aria-hidden="true" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <a href="/" className="flex items-center gap-3" aria-label="KanbanKaii home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-300/50">
              K
            </span>
            <span className="text-lg font-bold tracking-tight">KanbanKaii</span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="transition hover:text-violet-700" href="#how-it-works">How it works</a>
            <a className="transition hover:text-violet-700" href="#features">Features</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a className="hidden px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-violet-700 sm:block" href="/auth">
              Sign in
            </a>
            <a className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-violet-700" href={workspaceHref}>
              {workspaceLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>

        <section className="relative z-[1] mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-32 lg:pt-24">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Conversation into action
            </div>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              Your messages already know what needs to be done.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              KanbanKaii spots actionable work in Slack, structures it with AI, and places it on your private board—without turning every conversation into a ticket.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-300/40 transition hover:-translate-y-0.5 hover:bg-violet-700" href={workspaceHref}>
                {workspaceLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-700" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              {['Private by default', 'Realtime tickets', 'Human editable'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /></span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <KanbanKaiiPortfolioMockup />
        </section>
      </div>

      <section id="how-it-works" className="bg-slate-950 px-5 py-24 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">How it works</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Less copying. More doing.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:justify-self-end">
              Keep talking where work happens. KanbanKaii handles the repetitive part between a request being made and a useful ticket appearing.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="bg-slate-950 p-7 transition hover:bg-white/[0.04] sm:p-9">
                <span className="text-xs font-black text-violet-400">{feature.number}</span>
                <h3 className="mt-12 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-14 rounded-[2rem] border border-violet-100 bg-white p-7 shadow-xl shadow-violet-100/40 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Built for focused work</p>
            <h2 className="mt-4 max-w-lg text-4xl font-black tracking-[-0.045em] sm:text-5xl">A quieter path from message to momentum.</h2>
          </div>
          <div className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><Check className="h-4 w-4" /></span>
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center rounded-[2rem] bg-violet-600 px-6 py-16 text-center text-white sm:px-12">
          <h2 className="max-w-2xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">Give every real request somewhere to go.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-violet-100">Connect Slack, keep your conversations natural, and let your private board collect the work worth doing.</p>
          <a className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-violet-700 shadow-xl transition hover:-translate-y-0.5" href={workspaceHref}>
            {workspaceLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold text-slate-700">KanbanKaii</span>
          <span>Private AI-assisted ticket management.</span>
        </div>
      </footer>
    </main>
  );
}

function KanbanKaiiPortfolioMockup() {
  return (
    <div className="relative mx-auto min-h-[520px] w-full max-w-2xl lg:mx-0">
      <div className="absolute inset-4 rounded-[2.5rem] bg-violet-300/25 blur-3xl" aria-hidden="true" />
      <div className="portfolio-mockup-grid absolute inset-0 rounded-[2rem]" aria-hidden="true" />

      <div className="portfolio-float-slow absolute left-0 top-8 z-20 w-[min(22rem,88vw)] rounded-[1.4rem] border border-white/70 bg-[#201d2b] p-4 text-white shadow-[0_30px_90px_-35px_rgba(31,24,62,0.75)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-100">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-violet-500/25">
              <MessageSquare className="h-4 w-4 text-violet-200" />
            </span>
            Slack mention
          </div>
          <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-black text-emerald-200">LIVE</span>
        </div>
        <div className="landing-message mt-5 rounded-2xl rounded-bl-md bg-white/10 p-4 ring-1 ring-white/10">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-300 text-[10px] font-black text-amber-950">AK</span>
            <div>
              <p className="text-xs font-black">Aisha</p>
              <p className="text-[9px] text-slate-400">#product-team · now</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-100">
            <span className="rounded bg-violet-500/30 px-1.5 py-0.5 text-violet-100">@Noah</span> can you fix the checkout validation before tomorrow?
          </p>
        </div>
      </div>

      <div className="portfolio-flow-line portfolio-flow-line-one absolute left-[35%] top-[11rem] z-10 hidden h-24 w-44 rounded-full border-t-2 border-dashed border-violet-300/70 md:block" aria-hidden="true" />
      <div className="portfolio-flow-line portfolio-flow-line-two absolute right-[18%] top-[17rem] z-10 hidden h-24 w-44 rounded-full border-t-2 border-dashed border-indigo-300/70 md:block" aria-hidden="true" />

      <div className="portfolio-float-fast absolute right-2 top-48 z-30 w-[min(19rem,82vw)] rounded-[1.35rem] border border-violet-100 bg-white/95 p-4 shadow-[0_28px_70px_-35px_rgba(79,70,229,0.75)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-900">AI triage queue</p>
          <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">Redis</span>
        </div>
        <div className="landing-thinking mt-4 space-y-3">
          {[
            ['Actionable task', 'true'],
            ['Priority', 'High'],
            ['Assignee', 'Noah'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-400">{label}</span>
              <span className="text-[10px] font-black text-slate-800">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-bold text-white">
          <span className="landing-pulse h-1.5 w-1.5 rounded-full bg-white" />
          Structured JSON emitted
        </div>
      </div>

      <div className="absolute bottom-2 left-6 right-0 z-20 rounded-[1.7rem] border border-white/80 bg-white/90 p-4 shadow-[0_35px_110px_-48px_rgba(30,41,59,0.65)] backdrop-blur sm:left-16 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">KanbanKaii board</p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">Ticket created from Slack in realtime</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">Online</span>
        </div>
        <div className="grid h-56 grid-cols-3 gap-3">
          {['Pending', 'In progress', 'Completed'].map((column, index) => (
            <div key={column} className="rounded-2xl bg-slate-100/80 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-600">{column}</span>
                <span className="text-[10px] text-slate-400">{index === 0 ? '1' : '0'}</span>
              </div>
              {index === 0 ? (
                <div className="landing-ticket rounded-2xl border border-violet-100 bg-white p-3 shadow-lg shadow-violet-100/60">
                  <span className="rounded-md bg-rose-50 px-2 py-1 text-[8px] font-black text-rose-600">HIGH</span>
                  <h3 className="mt-3 text-xs font-black leading-4 text-slate-900">Fix checkout validation</h3>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-400">Resolve the checkout validation bug before tomorrow.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-bold text-slate-500">Slack</span>
                    <span className="text-[9px] font-bold text-slate-400">Assigned by Aisha</span>
                  </div>
                </div>
              ) : (
                <div className="h-20 rounded-xl border border-dashed border-slate-200 bg-white/40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

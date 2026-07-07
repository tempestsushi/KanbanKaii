export function AuthBrandPanel() {
  return (
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
  );
}

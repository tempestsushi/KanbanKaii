import { Button } from '@/components/ui/button';
import { SlackIntegrationCard } from '@/integrations/slack/SlackIntegrationCard';

export function IntegrationsSettingsPanel() {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Integrations</h2>
      <p className="mt-1 text-xs text-slate-400">Connect the accounts that will send messages for AI triage.</p>
      <div className="mt-5 space-y-3">
        <SlackIntegrationCard />
        <IntegrationCard
          name="GitHub"
          description="Turn assigned issues, review requests, and actionable mentions into tickets on your private board."
          comingSoon
        />
      </div>
    </section>
  );
}

function IntegrationCard({ name, description, comingSoon = false }: { name: string; description: string; comingSoon?: boolean }) {
  return (
    <article className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${comingSoon ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
              {comingSoon ? 'Coming soon' : 'Not connected'}
            </span>
          </div>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">{description}</p>
        </div>
      </div>
      <Button type="button" variant="outline" disabled={comingSoon}>
        {comingSoon ? 'Coming soon' : `Connect ${name}`}
      </Button>
    </article>
  );
}

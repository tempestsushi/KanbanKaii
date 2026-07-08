import { SlackIntegrationCard } from '@/integrations/slack/SlackIntegrationCard';

export function IntegrationsSettingsPanel() {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-800">Integrations</h2>
      <p className="mt-1 text-xs text-slate-400">Connect the accounts that will send messages for AI triage.</p>
      <div className="mt-5 space-y-3">
        <SlackIntegrationCard />
      </div>
    </section>
  );
}

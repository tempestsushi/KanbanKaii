import type { OrganizationSlackBindingStatus } from '@/integrations/slack/api';
import { Button } from '@/components/ui/button';

interface OrganizationSlackWorkspacePanelProps {
  slackBinding: OrganizationSlackBindingStatus;
  isOwner: boolean;
  isConnectingSlack: boolean;
  onConnectSlack: () => void;
}

export function OrganizationSlackWorkspacePanel({
  slackBinding,
  isOwner,
  isConnectingSlack,
  onConnectSlack,
}: OrganizationSlackWorkspacePanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Organization Slack workspace</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${slackBinding.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {slackBinding.connected ? 'Verified' : 'Not connected'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {slackBinding.connected
              ? `${slackBinding.workspace_name} · ${slackBinding.slack_team_id}`
              : 'Bind the formal organization board to one verified Slack workspace.'}
          </p>
          {!isOwner && !slackBinding.connected && (
            <p className="mt-1 text-[11px] text-slate-400">Only the organization owner can establish this connection.</p>
          )}
        </div>
        {isOwner && (
          <Button type="button" variant="outline" disabled={isConnectingSlack} onClick={onConnectSlack}>
            {isConnectingSlack ? 'Opening Slack…' : slackBinding.connected ? 'Reverify workspace' : 'Connect workspace'}
          </Button>
        )}
      </div>
    </section>
  );
}

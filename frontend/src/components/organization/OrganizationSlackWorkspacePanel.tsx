import type { OrganizationSlackBindingStatus } from '@/integrations/slack/api';
import { Button } from '@/components/ui/button';

interface OrganizationSlackWorkspacePanelProps {
  slackBinding: OrganizationSlackBindingStatus;
  isOwner: boolean;
  isConnectingSlack: boolean;
  isRefreshingSlackChannels: boolean;
  onConnectSlack: () => void;
  onRefreshSlackChannels: () => void;
}

export function OrganizationSlackWorkspacePanel({
  slackBinding,
  isOwner,
  isConnectingSlack,
  isRefreshingSlackChannels,
  onConnectSlack,
  onRefreshSlackChannels,
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
          {slackBinding.reconnect_required && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              {slackBinding.reconnect_reason ?? 'Slack permissions changed. Reconnect Slack once.'}
            </p>
          )}
          {!isOwner && !slackBinding.connected && (
            <p className="mt-1 text-[11px] text-slate-400">Only the organization owner can establish this connection.</p>
          )}
        </div>
        {isOwner && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {slackBinding.connected && (
              <Button
                type="button"
                variant="outline"
                disabled={isRefreshingSlackChannels || isConnectingSlack}
                onClick={onRefreshSlackChannels}
              >
                {isRefreshingSlackChannels ? 'Refreshing…' : 'Refresh channels'}
              </Button>
            )}
            <Button type="button" variant="outline" disabled={isConnectingSlack} onClick={onConnectSlack}>
              {isConnectingSlack ? 'Opening Slack…' : slackBinding.connected ? 'Reconnect Slack' : 'Connect workspace'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

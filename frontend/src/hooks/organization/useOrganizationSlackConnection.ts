import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Organization } from '@/api/organizations';
import {
  getOrganizationSlackStatus,
  refreshOrganizationSlackChannels,
  startSlackConnection,
  type OrganizationSlackBindingStatus,
  type SlackChannelRefreshResponse,
} from '@/integrations/slack/api';
import { disconnectedSlackBinding } from './organizationConstants';

type OrganizationSlackConnectionOptions = {
  isOwner: boolean;
  organization: Organization | null;
};

export function useOrganizationSlackConnection({
  isOwner,
  organization,
}: OrganizationSlackConnectionOptions) {
  const [slackBinding, setSlackBinding] = useState<OrganizationSlackBindingStatus>(disconnectedSlackBinding);
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const [isRefreshingSlackChannels, setIsRefreshingSlackChannels] = useState(false);
  const [latestSlackChannelRefresh, setLatestSlackChannelRefresh] =
    useState<SlackChannelRefreshResponse | null>(null);

  const resetConnectingSlack = useCallback(() => {
    setIsConnectingSlack(false);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const result = query.get('slack');
    if (result === 'organization_connected') {
      toast.success('Slack workspace verified and connected to the organization');
      resetConnectingSlack();
    } else if (result === 'error') {
      const reason = query.get('reason');
      toast.error(reason === 'workspace_owner_required'
        ? 'Slack connection requires a Slack workspace owner account'
        : `Slack connection failed: ${reason ?? 'unknown error'}`);
      resetConnectingSlack();
    }
    if (result) window.history.replaceState({}, '', window.location.pathname);
  }, [resetConnectingSlack]);

  useEffect(() => {
    if (!isConnectingSlack) return undefined;

    const resetWhenReturned = () => {
      if (document.visibilityState === 'visible') resetConnectingSlack();
    };
    const timeoutId = window.setTimeout(resetConnectingSlack, 90_000);

    window.addEventListener('focus', resetConnectingSlack);
    window.addEventListener('pageshow', resetConnectingSlack);
    document.addEventListener('visibilitychange', resetWhenReturned);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', resetConnectingSlack);
      window.removeEventListener('pageshow', resetConnectingSlack);
      document.removeEventListener('visibilitychange', resetWhenReturned);
    };
  }, [isConnectingSlack, resetConnectingSlack]);

  const connectOrganizationSlack = async () => {
    if (!organization || !isOwner || isConnectingSlack) return;
    setIsConnectingSlack(true);
    try {
      window.location.assign(await startSlackConnection(organization.id));
    } catch (connectError) {
      toast.error(connectError instanceof Error ? connectError.message : 'Could not connect Slack');
      setIsConnectingSlack(false);
    }
  };

  const refreshSlackChannels = async () => {
    if (!organization || !slackBinding.connected || isRefreshingSlackChannels) return;
    setIsRefreshingSlackChannels(true);
    try {
      const result = await refreshOrganizationSlackChannels(organization.id);
      setLatestSlackChannelRefresh(result);
      if (result.reconnect_required) {
        setSlackBinding((current) => ({
          ...current,
          reconnect_required: true,
          reconnect_reason: result.missing_scopes.length
            ? `Missing Slack scopes: ${result.missing_scopes.join(', ')}`
            : result.message,
        }));
        toast.error(result.message);
      } else {
        setSlackBinding(await getOrganizationSlackStatus(organization.id));
        const summary = result.channels_checked === 0
          ? result.message
          : `${result.message} Checked ${result.channels_checked}, joined ${result.channels_joined}, updated ${result.channels_updated}.`;
        if (result.manual_invites_required.length > 0) {
          toast.warning(
            `${summary} Private channels need one manual invite: ${result.manual_invites_required.join(', ')}`,
          );
        } else {
          toast.success(summary);
        }
      }
    } catch (refreshError) {
      setLatestSlackChannelRefresh(null);
      toast.error(refreshError instanceof Error ? refreshError.message : 'Could not refresh Slack channels');
    } finally {
      setIsRefreshingSlackChannels(false);
    }
  };

  return {
    connectOrganizationSlack,
    isConnectingSlack,
    isRefreshingSlackChannels,
    latestSlackChannelRefresh,
    refreshSlackChannels,
    setSlackBinding,
    slackBinding,
  };
}

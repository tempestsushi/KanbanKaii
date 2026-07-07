import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Organization } from '@/api/organizations';
import {
  startSlackConnection,
  type OrganizationSlackBindingStatus,
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

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const result = query.get('slack');
    if (result === 'organization_connected') {
      toast.success('Slack workspace verified and connected to the organization');
    } else if (result === 'error') {
      const reason = query.get('reason');
      toast.error(reason === 'workspace_owner_required'
        ? 'Slack connection requires a Slack workspace owner account'
        : `Slack connection failed: ${reason ?? 'unknown error'}`);
    }
    if (result) window.history.replaceState({}, '', window.location.pathname);
  }, []);

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

  return {
    connectOrganizationSlack,
    isConnectingSlack,
    setSlackBinding,
    slackBinding,
  };
}

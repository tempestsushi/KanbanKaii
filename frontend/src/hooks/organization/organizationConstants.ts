import type { OrganizationSlackBindingStatus } from '@/integrations/slack/api';

export const disconnectedSlackBinding: OrganizationSlackBindingStatus = {
  connected: false,
  workspace_name: null,
  slack_team_id: null,
  verified_at: null,
};

import { getSupabaseClient } from '@/lib/supabase';

export type OrganizationRole = 'OWNER' | 'TEAM_LEAD' | 'MEMBER' | 'VIEWER';
export type AssignableRole = Exclude<OrganizationRole, 'OWNER'>;
export type OrganizationBoardRole = 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  invited_by: string | null;
  joined_at: string;
  display_name: string;
  job_title: string | null;
  avatar_url: string | null;
}

export interface OrganizationBoard {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationBoardMember {
  board_id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationBoardRole;
  added_by: string | null;
  joined_at: string;
  display_name: string;
  job_title: string | null;
  avatar_url: string | null;
}

export interface OrganizationBoardSlackChannel {
  organization_id: string;
  board_id: string;
  slack_team_id: string;
  slack_channel_id: string;
  slack_channel_name: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  intended_email: string | null;
  default_role: AssignableRole;
  created_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  declined_at: string | null;
  declined_by: string | null;
}

export interface CreatedOrganizationInvite extends OrganizationInvite {
  token: string;
}

export interface MyOrganizationInvitation {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  default_role: AssignableRole;
  created_by: string;
  created_at: string;
  expires_at: string;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Your session has expired. Please sign in again.');

  const response = await fetch(new URL(path, apiBaseUrl), {
    ...init,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'ngrok-skip-browser-warning': '1',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Organization request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const listOrganizations = () => apiRequest<Organization[]>('/api/organizations');
export const createOrganization = (name: string, slug: string) => apiRequest<Organization>('/api/organizations', { method: 'POST', body: JSON.stringify({ name, slug }) });
export const deleteOrganization = (id: string, confirmationSlug: string) => apiRequest<void>(`/api/organizations/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmation_slug: confirmationSlug }) });
export const leaveOrganization = (id: string) => apiRequest<void>(`/api/organizations/${id}/leave`, { method: 'POST' });
export const listOrganizationMembers = (id: string) => apiRequest<OrganizationMember[]>(`/api/organizations/${id}/members`);
export const changeOrganizationMemberRole = (id: string, userId: string, role: AssignableRole) => apiRequest<OrganizationMember>(`/api/organizations/${id}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeOrganizationMember = (id: string, userId: string) => apiRequest<void>(`/api/organizations/${id}/members/${userId}`, { method: 'DELETE' });
export const listOrganizationBoards = (id: string) => apiRequest<OrganizationBoard[]>(`/api/organizations/${id}/boards`);
export const createOrganizationBoard = (id: string, name: string, slug: string) => apiRequest<OrganizationBoard>(`/api/organizations/${id}/boards`, { method: 'POST', body: JSON.stringify({ name, slug }) });
export const deleteOrganizationBoard = (id: string, boardId: string) => apiRequest<void>(`/api/organizations/${id}/boards/${boardId}`, { method: 'DELETE' });
export const listOrganizationBoardMembers = (id: string, boardId: string) => apiRequest<OrganizationBoardMember[]>(`/api/organizations/${id}/boards/${boardId}/members`);
export const addOrganizationBoardMember = (id: string, boardId: string, userId: string, role: OrganizationBoardRole = 'MEMBER') => apiRequest<OrganizationBoardMember>(`/api/organizations/${id}/boards/${boardId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId, role }) });
export const changeOrganizationBoardMemberRole = (id: string, boardId: string, userId: string, role: OrganizationBoardRole) => apiRequest<OrganizationBoardMember>(`/api/organizations/${id}/boards/${boardId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeOrganizationBoardMember = (id: string, boardId: string, userId: string) => apiRequest<void>(`/api/organizations/${id}/boards/${boardId}/members/${userId}`, { method: 'DELETE' });
export const listOrganizationBoardSlackChannels = (id: string, boardId: string) => apiRequest<OrganizationBoardSlackChannel[]>(`/api/organizations/${id}/boards/${boardId}/slack-channels`);
export const addOrganizationBoardSlackChannel = (id: string, boardId: string, slackTeamId: string, slackChannelId: string, slackChannelName?: string) => apiRequest<OrganizationBoardSlackChannel>(`/api/organizations/${id}/boards/${boardId}/slack-channels`, { method: 'POST', body: JSON.stringify({ slack_team_id: slackTeamId, slack_channel_id: slackChannelId, slack_channel_name: slackChannelName || null }) });
export const removeOrganizationBoardSlackChannel = (id: string, boardId: string, slackTeamId: string, slackChannelId: string) => apiRequest<void>(`/api/organizations/${id}/boards/${boardId}/slack-channels/${encodeURIComponent(slackTeamId)}/${encodeURIComponent(slackChannelId)}`, { method: 'DELETE' });
export const listOrganizationInvites = (id: string) => apiRequest<OrganizationInvite[]>(`/api/organizations/${id}/invites`);
export const createOrganizationInvite = (id: string, intendedEmail: string, defaultRole: AssignableRole) => apiRequest<CreatedOrganizationInvite>(`/api/organizations/${id}/invites`, { method: 'POST', body: JSON.stringify({ intended_email: intendedEmail, default_role: defaultRole, expires_in_hours: 72 }) });
export const revokeOrganizationInvite = (id: string, inviteId: string) => apiRequest<void>(`/api/organizations/${id}/invites/${inviteId}`, { method: 'DELETE' });
export const acceptOrganizationInvite = (token: string) => apiRequest<{ organization_id: string }>(`/api/organizations/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
export const listMyOrganizationInvitations = () => apiRequest<MyOrganizationInvitation[]>('/api/organizations/invitations/pending');
export const acceptMyOrganizationInvitation = (inviteId: string) => apiRequest<{ organization_id: string }>(`/api/organizations/invitations/${inviteId}/accept`, { method: 'POST' });
export const declineMyOrganizationInvitation = (inviteId: string) => apiRequest<void>(`/api/organizations/invitations/${inviteId}/decline`, { method: 'POST' });

import { getSupabaseClient } from '@/lib/supabase';

export type OrganizationRole = 'OWNER' | 'TEAM_LEAD' | 'MEMBER' | 'VIEWER';
export type AssignableRole = Exclude<OrganizationRole, 'OWNER'>;

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
}

export interface CreatedOrganizationInvite extends OrganizationInvite {
  token: string;
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
export const listOrganizationMembers = (id: string) => apiRequest<OrganizationMember[]>(`/api/organizations/${id}/members`);
export const changeOrganizationMemberRole = (id: string, userId: string, role: AssignableRole) => apiRequest<OrganizationMember>(`/api/organizations/${id}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeOrganizationMember = (id: string, userId: string) => apiRequest<void>(`/api/organizations/${id}/members/${userId}`, { method: 'DELETE' });
export const listOrganizationInvites = (id: string) => apiRequest<OrganizationInvite[]>(`/api/organizations/${id}/invites`);
export const createOrganizationInvite = (id: string, intendedEmail: string, defaultRole: AssignableRole) => apiRequest<CreatedOrganizationInvite>(`/api/organizations/${id}/invites`, { method: 'POST', body: JSON.stringify({ intended_email: intendedEmail || null, default_role: defaultRole, expires_in_hours: 72 }) });
export const revokeOrganizationInvite = (id: string, inviteId: string) => apiRequest<void>(`/api/organizations/${id}/invites/${inviteId}`, { method: 'DELETE' });
export const acceptOrganizationInvite = (token: string) => apiRequest<{ organization_id: string }>(`/api/organizations/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });

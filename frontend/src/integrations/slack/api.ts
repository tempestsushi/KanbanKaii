import { getSupabaseClient } from '@/lib/supabase';

interface SlackConnectResponse {
  authorization_url: string;
}

export interface SlackConnectionStatus {
  connected: boolean;
  workspace_name: string | null;
}

async function authToken(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return data.session.access_token;
}

export async function startSlackConnection(): Promise<string> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');

  const response = await fetch(
    new URL('/api/integrations/slack/connect', apiBaseUrl),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
      },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Could not start Slack connection (${response.status})`);
  }

  const result = (await response.json()) as SlackConnectResponse;
  return result.authorization_url;
}

export async function getSlackConnectionStatus(): Promise<SlackConnectionStatus> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');

  const response = await fetch(
    new URL('/api/integrations/slack/status', apiBaseUrl),
    {
      headers: { Authorization: `Bearer ${await authToken()}` },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Could not load Slack status (${response.status})`);
  }
  return (await response.json()) as SlackConnectionStatus;
}

export async function disconnectSlack(): Promise<void> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');

  const response = await fetch(
    new URL('/api/integrations/slack', apiBaseUrl),
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await authToken()}` },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Could not disconnect Slack (${response.status})`);
  }
}

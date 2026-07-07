import type {
  Ticket,
  TicketPriority,
  TicketSource,
  TicketStatus,
  TicketFormValues,
} from '@/types/ticket';
import { getSupabaseClient } from '@/lib/supabase';

type ApiPriority = 'HIGH' | 'MEDIUM' | 'LOW';
type ApiStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface ApiTicket {
  id: string;
  owner_id: string;
  scope: 'PRIVATE' | 'PERSONAL_ASSIGNMENT' | 'ORGANIZATION';
  organization_id: string | null;
  board_id: string | null;
  created_by: string | null;
  assigned_by_user_id: string | null;
  assignee_user_id: string | null;
  title: string;
  description: string;
  priority: ApiPriority;
  status: ApiStatus;
  assignee: string;
  source: string;
  requested_by_name: string | null;
  source_message_state: 'ACTIVE' | 'DELETED';
  source_message_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const priorityMap: Record<ApiPriority, TicketPriority> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const statusMap: Record<ApiStatus, TicketStatus> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const apiStatusMap: Record<TicketStatus, ApiStatus> = {
  Pending: 'PENDING',
  'In Progress': 'IN_PROGRESS',
  Completed: 'COMPLETED',
};

const apiPriorityMap: Record<TicketPriority, ApiPriority> = {
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
};

function mapSource(source: string): TicketSource {
  if (source === 'SLACK') return 'Slack';
  if (source === 'GITHUB') return 'GitHub';
  return 'Manual';
}

export function mapApiTicket(ticket: ApiTicket): Ticket {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: priorityMap[ticket.priority],
    status: statusMap[ticket.status],
    assignee: ticket.assignee,
    source: mapSource(ticket.source),
    ownerId: ticket.owner_id,
    scope: ticket.scope,
    organizationId: ticket.organization_id ?? undefined,
    boardId: ticket.board_id ?? undefined,
    createdBy: ticket.created_by ?? undefined,
    assignedByUserId: ticket.assigned_by_user_id ?? undefined,
    assigneeUserId: ticket.assignee_user_id ?? undefined,
    requestedByName: ticket.requested_by_name ?? undefined,
    sourceMessageState: ticket.source_message_state,
    sourceMessageDeletedAt: ticket.source_message_deleted_at ?? undefined,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  };
}

interface FetchTicketsOptions {
  status?: ApiStatus;
  signal?: AbortSignal;
}

async function authenticatedHeaders(
  includeJson = false,
): Promise<Record<string, string>> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    'ngrok-skip-browser-warning': '1',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function fetchTickets(
  options: FetchTicketsOptions = {},
): Promise<Ticket[]> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Frontend API configuration is missing');
  }

  const url = new URL('/api/tickets', apiBaseUrl);
  if (options.status) url.searchParams.set('status', options.status);

  const response = await fetch(url, {
    signal: options.signal,
    headers: await authenticatedHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Could not load tickets (${response.status})`);
  }

  const tickets = (await response.json()) as ApiTicket[];
  return tickets.map(mapApiTicket);
}

export async function fetchOrganizationTickets(
  organizationId: string,
  options: FetchTicketsOptions = {},
): Promise<Ticket[]> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');

  const url = new URL(`/api/tickets/organizations/${organizationId}`, apiBaseUrl);
  if (options.status) url.searchParams.set('status', options.status);
  const response = await fetch(url, {
    signal: options.signal,
    headers: await authenticatedHeaders(),
  });
  if (!response.ok) throw new Error(`Could not load organization tickets (${response.status})`);
  return ((await response.json()) as ApiTicket[]).map(mapApiTicket);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<Ticket> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Frontend API configuration is missing');
  }

  const url = new URL(`/api/tickets/${ticketId}/status`, apiBaseUrl);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: await authenticatedHeaders(true),
    body: JSON.stringify({ status: apiStatusMap[status] }),
  });
  if (!response.ok) {
    throw new Error(`Could not update ticket (${response.status})`);
  }

  return mapApiTicket((await response.json()) as ApiTicket);
}

export async function updateTicket(
  ticketId: string,
  values: TicketFormValues,
): Promise<Ticket> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');

  const response = await fetch(new URL(`/api/tickets/${ticketId}`, apiBaseUrl), {
    method: 'PATCH',
    headers: await authenticatedHeaders(true),
    body: JSON.stringify({
      title: values.title,
      description: values.description,
      priority: apiPriorityMap[values.priority],
      status: apiStatusMap[values.status],
      assignee: values.assignee,
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not update ticket (${response.status})`);
  }

  return mapApiTicket((await response.json()) as ApiTicket);
}

export async function updateOrganizationTicket(
  organizationId: string,
  ticketId: string,
  values: TicketFormValues,
): Promise<Ticket> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');
  const response = await fetch(
    new URL(`/api/tickets/organizations/${organizationId}/${ticketId}`, apiBaseUrl),
    {
      method: 'PATCH',
      headers: await authenticatedHeaders(true),
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        priority: apiPriorityMap[values.priority],
        status: apiStatusMap[values.status],
        assignee: values.assignee,
      }),
    },
  );
  if (!response.ok) throw new Error(`Could not update organization ticket (${response.status})`);
  return mapApiTicket((await response.json()) as ApiTicket);
}

export async function createTicket(values: TicketFormValues): Promise<Ticket> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Frontend API configuration is missing');
  }

  const response = await fetch(new URL('/api/tickets', apiBaseUrl), {
    method: 'POST',
    headers: await authenticatedHeaders(true),
    body: JSON.stringify({
      title: values.title,
      description: values.description,
      priority: apiPriorityMap[values.priority],
      status: apiStatusMap[values.status],
      assignee: values.assignee,
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create ticket (${response.status})`);
  }

  return mapApiTicket((await response.json()) as ApiTicket);
}

export async function createOrganizationTicket(
  organizationId: string,
  values: TicketFormValues,
): Promise<Ticket> {
  if (!values.assigneeUserId) throw new Error('Select an organization member');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');
  const response = await fetch(
    new URL(`/api/tickets/organizations/${organizationId}`, apiBaseUrl),
    {
      method: 'POST',
      headers: await authenticatedHeaders(true),
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        priority: apiPriorityMap[values.priority],
        status: apiStatusMap[values.status],
        assignee_user_id: values.assigneeUserId,
      }),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Could not create organization ticket (${response.status})`);
  }
  return mapApiTicket((await response.json()) as ApiTicket);
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Frontend API configuration is missing');
  }

  const url = new URL(`/api/tickets/${ticketId}`, apiBaseUrl);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: await authenticatedHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Could not delete ticket (${response.status})`);
  }
}

export async function deleteOrganizationTicket(
  organizationId: string,
  ticketId: string,
): Promise<void> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('Frontend API configuration is missing');
  const response = await fetch(
    new URL(`/api/tickets/organizations/${organizationId}/${ticketId}`, apiBaseUrl),
    { method: 'DELETE', headers: await authenticatedHeaders() },
  );
  if (!response.ok) throw new Error(`Could not delete organization ticket (${response.status})`);
}

export const TICKET_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export const TICKET_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const TICKET_SOURCES = ['Slack', 'GitHub', 'Manual'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  source: TicketSource;
  createdAt?: string;
}

export type TicketFormValues = Omit<Ticket, 'id'>;

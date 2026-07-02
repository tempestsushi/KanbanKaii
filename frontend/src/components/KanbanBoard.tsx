import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { ArrowDownUp, ListFilter, Plus, Search } from 'lucide-react';
import {
  createTicket,
  deleteTicket as deleteStoredTicket,
  fetchTickets,
  mapApiTicket,
  updateTicket,
  updateTicketStatus,
  type ApiTicket,
} from '@/api/tickets';
import {
  TICKET_STATUSES,
  type Ticket,
  type TicketFormValues,
  type TicketStatus,
} from '@/types/ticket';
import { KanbanColumn } from './KanbanColumn';
import { TicketCard } from './TicketCard';
import { TicketModal } from './TicketModal';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';


function mergeTicket(items: Ticket[], incoming: Ticket): Ticket[] {
  const existingIndex = items.findIndex((ticket) => ticket.id === incoming.id);
  if (existingIndex === -1) return [incoming, ...items];
  return items.map((ticket) => ticket.id === incoming.id ? incoming : ticket);
}

export function KanbanBoard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TicketStatus>('Pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const loadTickets = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setTickets(await fetchTickets({ signal }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Could not load tickets');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTickets(controller.signal);
    return () => controller.abort();
  }, [loadTickets]);

  useEffect(() => {
    if (!user) return undefined;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`tickets:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = mapApiTicket(payload.new as ApiTicket);
          setTickets((items) => mergeTicket(items, incoming));
          if (incoming.source === 'Slack') {
            toast.success(`New Slack ticket: ${incoming.title}`);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = mapApiTicket(payload.new as ApiTicket);
          setTickets((items) => mergeTicket(items, incoming));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTicket = tickets.find((ticket) => ticket.id === activeId);

  const statusFromDropTarget = (id: string): TicketStatus | undefined => {
    const targetTicket = tickets.find((ticket) => ticket.id === id);
    if (targetTicket) return targetTicket.status;
    return TICKET_STATUSES.find((status) => status === id);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const nextStatus = statusFromDropTarget(String(over.id));
    const current = tickets.find((ticket) => ticket.id === active.id);
    if (!current || !nextStatus || current.status === nextStatus) return;

    setTickets((items) =>
      items.map((ticket) => ticket.id === active.id ? { ...ticket, status: nextStatus } : ticket),
    );
    void updateTicketStatus(current.id, nextStatus)
      .then((savedTicket) => {
        setTickets((items) =>
          items.map((ticket) => ticket.id === savedTicket.id ? savedTicket : ticket),
        );
        toast.success(`Moved to ${nextStatus}`);
      })
      .catch(() => {
        setTickets((items) =>
          items.map((ticket) => ticket.id === current.id ? current : ticket),
        );
        toast.error('Could not save the status change');
      });
  };

  const openEditor = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setModalOpen(true);
  };

  const openCreator = (status: TicketStatus) => {
    setEditingTicket(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const saveTicket = async (values: TicketFormValues): Promise<boolean> => {
    if (editingTicket) {
      try {
        const updatedTicket = await updateTicket(editingTicket.id, values);
        setTickets((items) =>
          items.map((item) => item.id === updatedTicket.id ? updatedTicket : item),
        );
        setModalOpen(false);
        toast.success('Ticket updated');
        return true;
      } catch {
        toast.error('Could not update the ticket');
        return false;
      }
    }

    try {
      const createdTicket = await createTicket(values);
      setTickets((items) => mergeTicket(items, createdTicket));
      setModalOpen(false);
      toast.success('Ticket created');
      return true;
    } catch {
      toast.error('Could not create the ticket');
      return false;
    }
  };

  const deleteTicket = async (id: string): Promise<boolean> => {
    try {
      await deleteStoredTicket(id);
      setTickets((items) => items.filter((ticket) => ticket.id !== id));
      setModalOpen(false);
      toast.success('Ticket deleted');
      return true;
    } catch {
      toast.error('Could not delete the ticket');
      return false;
    }
  };

  return (
    <>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-slate-400 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tickets"
            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => openCreator('Pending')} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-600">
            <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New ticket</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <ListFilter className="h-3.5 w-3.5" /><span className="hidden sm:inline">Filter</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <ArrowDownUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sort</span>
          </button>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }: DragStartEvent) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        {isLoading && (
          <div className="border-b border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
            Loading tickets…
          </div>
        )}
        {loadError && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700">
            <span>{loadError}</span>
            <button
              type="button"
              className="font-semibold hover:text-red-900"
              onClick={() => void loadTickets()}
            >
              Retry
            </button>
          </div>
        )}
        <div className="grid min-h-[calc(100vh-7.5rem)] min-w-[760px] grid-cols-3 divide-x divide-slate-200 bg-slate-100/70">
          {TICKET_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={status}
              tickets={tickets.filter((ticket) => ticket.status === status && `${ticket.title} ${ticket.description} ${ticket.assignee}`.toLowerCase().includes(query.toLowerCase()))}
              onEdit={openEditor}
              onAdd={openCreator}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeTicket ? <TicketCard ticket={activeTicket} onEdit={() => undefined} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <TicketModal
        ticket={editingTicket}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveTicket}
        onDelete={deleteTicket}
        defaultStatus={defaultStatus}
      />
    </>
  );
}

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { TicketCard } from './TicketCard';
import type { Ticket, TicketStatus } from '@/types/ticket';
import { MoreVertical, Plus } from 'lucide-react';

interface KanbanColumnProps {
  id: TicketStatus;
  title: TicketStatus;
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onAdd: (status: TicketStatus) => void;
}

export function KanbanColumn({ id, title, tickets, onEdit, onAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-full w-full min-w-0 flex-col bg-slate-100/60 px-3 py-3 sm:px-4',
        isOver && 'bg-violet-50 ring-1 ring-inset ring-violet-300'
      )}
    >
      <div className="mb-3 flex h-7 items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
          <span className="text-[11px] text-slate-400">{tickets.length}</span>
        </div>
        <div className="flex items-center text-slate-400">
          <button aria-label={`Add ticket to ${title}`} onClick={() => onAdd(title)} className="rounded p-1 hover:bg-white hover:text-violet-600"><Plus className="h-3.5 w-3.5" /></button>
          <button aria-label={`${title} options`} className="rounded p-1 hover:bg-white hover:text-slate-700"><MoreVertical className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="min-h-[240px] flex-1 space-y-2.5">
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onEdit={onEdit} />
          ))}
        </SortableContext>
      </div>
      <button onClick={() => onAdd(title)} className="mt-2 flex items-center gap-1 py-1 text-[11px] font-medium text-slate-400 hover:text-violet-600"><Plus className="h-3.5 w-3.5" /> New</button>
    </div>
  );
}

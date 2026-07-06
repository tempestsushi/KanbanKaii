import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';
import { Github, GripVertical, MessageSquare, UserRound } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  overlay?: boolean;
  draggable?: boolean;
}

const priorityConfig = {
  High: {
    bg: 'bg-red-50 text-red-700 border-red-200',
    dark: 'dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  },
  Medium: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
  },
  Low: {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    dark: 'dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800',
  },
};

export function TicketCard({ ticket, onEdit, overlay = false, draggable = true }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id, disabled: overlay || !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[ticket.priority];

  const SourceIcon = ticket.source === 'GitHub' ? Github : MessageSquare;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(ticket)}
      className={cn(
        'group relative cursor-pointer rounded border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md',
        isDragging && 'opacity-50 rotate-2 shadow-xl ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="pr-6 text-xs font-semibold leading-snug text-slate-800">
          {ticket.title}
        </h4>
        {draggable && <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2.5 top-2.5 cursor-grab rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>}
      </div>

      {ticket.description && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
          {ticket.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold',
            priority.bg,
            priority.dark
          )}
        >
          {ticket.priority}
        </span>

        <span className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
          <SourceIcon className="h-3 w-3" /> {ticket.source}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[10px] text-slate-400">
        <UserRound className="h-3.5 w-3.5" />
        <span className="truncate">{ticket.assignee}</span>
      </div>
    </div>
  );
}

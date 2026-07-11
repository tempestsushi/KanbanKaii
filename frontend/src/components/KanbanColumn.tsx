import { useEffect, useState, type UIEvent, type WheelEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { TicketCard } from "./TicketCard";
import { TicketCardSkeleton } from "./TicketCardSkeleton";
import type { Ticket, TicketStatus } from "@/types/ticket";
import Plus from "lucide-react/dist/esm/icons/plus";

const COLUMN_BATCH_SIZE = 3;

interface KanbanColumnProps {
  id: TicketStatus;
  title: TicketStatus;
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onAdd: (status: TicketStatus) => void;
  canAdd?: boolean;
  canDragTicket?: (ticket: Ticket) => boolean;
  boardNames?: Record<string, string>;
  isLoading?: boolean;
}

export function KanbanColumn({
  id,
  title,
  tickets,
  onEdit,
  onAdd,
  canAdd = true,
  canDragTicket = () => true,
  boardNames = {},
  isLoading = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [visibleCount, setVisibleCount] = useState(COLUMN_BATCH_SIZE);
  const visibleTickets = tickets.slice(0, visibleCount);
  const hasMoreTickets = visibleCount < tickets.length;
  const shouldShowSkeletons = isLoading && visibleTickets.length === 0;

  useEffect(() => {
    setVisibleCount((count) =>
      Math.min(
        Math.max(COLUMN_BATCH_SIZE, count),
        Math.max(COLUMN_BATCH_SIZE, tickets.length),
      ),
    );
  }, [tickets.length]);

  const showNextBatch = () => {
    if (hasMoreTickets) {
      setVisibleCount((count) =>
        Math.min(count + COLUMN_BATCH_SIZE, tickets.length),
      );
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const column = event.currentTarget;
    const distanceFromBottom =
      column.scrollHeight - column.scrollTop - column.clientHeight;
    if (distanceFromBottom < 48) showNextBatch();
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const column = event.currentTarget;
    const isAtBottom =
      column.scrollHeight - column.scrollTop - column.clientHeight < 48;
    if (event.deltaY > 0 && isAtBottom) showNextBatch();
  };

  return (
    <div
      ref={setNodeRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className={cn(
        "flex h-[calc(100vh-7.5rem)] min-h-[360px] w-full min-w-0 flex-col overflow-y-auto bg-white px-3 py-3 sm:px-4",
        isOver && "bg-violet-50/70",
      )}
    >
      <div className="mb-3 flex h-7 items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
          <span className="text-[11px] text-slate-400">{tickets.length}</span>
        </div>
        {canAdd && (
          <button
            aria-label={`Add ticket to ${title}`}
            onClick={() => onAdd(title)}
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-violet-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-[240px] flex-1 space-y-2.5">
        {shouldShowSkeletons ? (
          <div aria-label={`${title} tickets loading`} className="space-y-2.5">
            {Array.from({ length: COLUMN_BATCH_SIZE }).map((_, index) => (
              <TicketCardSkeleton key={`${id}-skeleton-${index}`} />
            ))}
          </div>
        ) : (
          <SortableContext
            items={visibleTickets.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onEdit={onEdit}
                boardName={
                  ticket.boardId ? boardNames[ticket.boardId] : undefined
                }
                draggable={canDragTicket(ticket)}
              />
            ))}
          </SortableContext>
        )}
        {hasMoreTickets && (
          <button
            type="button"
            onClick={showNextBatch}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[11px] font-medium text-slate-500 hover:border-violet-300 hover:bg-white hover:text-violet-600"
          >
            Load 3 more
          </button>
        )}
      </div>
    </div>
  );
}

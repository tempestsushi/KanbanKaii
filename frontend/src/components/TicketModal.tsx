import { useEffect, useState } from 'react';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
  type Ticket,
  type TicketFormValues,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from '@/types/ticket';

interface TicketModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  defaultStatus: TicketStatus;
  onClose: () => void;
  onSave: (values: TicketFormValues) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  readOnly?: boolean;
  assigneeOptions?: Array<{ value: string; label: string }>;
}

export function TicketModal({ ticket, isOpen, defaultStatus, onClose, onSave, onDelete, readOnly = false, assigneeOptions }: TicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [status, setStatus] = useState<TicketStatus>('Pending');
  const [source, setSource] = useState<TicketSource>('Manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const isAssignedTicket = Boolean(ticket && ticket.scope !== 'PRIVATE');
  const hasRequester = Boolean(ticket?.requestedByName);

  useEffect(() => {
    setTitle(ticket?.title ?? '');
    setDescription(ticket?.description ?? '');
    setAssignee(ticket?.assignee ?? '');
    setAssigneeUserId(ticket?.assigneeUserId ?? assigneeOptions?.[0]?.value ?? '');
    setPriority(ticket?.priority ?? 'Medium');
    setStatus(ticket?.status ?? defaultStatus);
    setSource(ticket?.source ?? 'Manual');
  }, [ticket, defaultStatus, isOpen, assigneeOptions]);

  const submit = async () => {
    if (!title.trim() || !description.trim() || isSaving) return;
    setIsSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      assignee: assigneeOptions
        ? assigneeOptions.find((option) => option.value === assigneeUserId)?.label ?? ticket?.assignee ?? 'Unassigned'
        : assignee.trim() || 'Unassigned',
      assigneeUserId: assigneeUserId || ticket?.assigneeUserId,
      priority,
      status,
      source: ticket ? source : 'Manual',
    });
    setIsSaving(false);
  };

  const remove = async () => {
    if (!ticket || isSaving || isDeleting) return;
    setIsDeleting(true);
    const deleted = await onDelete(ticket.id);
    setIsDeleting(false);
    if (deleted) setDeleteConfirmationOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[26rem] grid-rows-[auto,minmax(0,1fr),auto] gap-0 overflow-hidden rounded-xl border-white/70 bg-white/95 p-0 shadow-2xl sm:max-h-[86vh] sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 px-4 py-3 pr-11 sm:px-5">
          <DialogTitle className="text-base">{readOnly ? 'Ticket details' : ticket ? 'Edit ticket' : 'Create ticket'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 overflow-y-auto px-4 py-3 sm:px-5">
          {(isAssignedTicket || hasRequester) && ticket && (
            <div className="grid gap-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                  {isAssignedTicket ? 'Assigned by' : 'Requested by'}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-700">{ticket.requestedByName ?? 'Organization lead'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                  {isAssignedTicket ? 'Assigned to' : 'Ticket owner'}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-700">{ticket.assignee}</p>
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-title">Title</Label>
            <Input className="h-10" id="ticket-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" disabled={readOnly} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea className="min-h-20" id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Add useful context and acceptance details" disabled={readOnly} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-assignee">Assignee</Label>
              {assigneeOptions && !ticket ? (
                <Select value={assigneeUserId} onValueChange={setAssigneeUserId} disabled={readOnly}>
                  <SelectTrigger id="ticket-assignee"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>{assigneeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input className="h-10" id="ticket-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Name" disabled={readOnly || Boolean(assigneeOptions)} />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: TicketPriority) => setPriority(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: TicketStatus) => setStatus(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={(value: TicketSource) => setSource(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_SOURCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:gap-2 sm:px-5">
          {ticket && !readOnly && <Button variant="destructive" className="sm:mr-auto" disabled={isSaving || isDeleting} onClick={() => setDeleteConfirmationOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          <Button variant="outline" disabled={isSaving || isDeleting} onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button disabled={!title.trim() || !description.trim() || (Boolean(assigneeOptions) && !ticket && !assigneeUserId) || isSaving || isDeleting} onClick={() => void submit()}>{isSaving ? (ticket ? 'Saving…' : 'Creating…') : ticket ? 'Save changes' : 'Create ticket'}</Button>}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteConfirmationOpen} onOpenChange={(open) => !isDeleting && setDeleteConfirmationOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-slate-700">{ticket?.title}</span> will be permanently removed from your board. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep ticket</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void remove(); }}>
              {isDeleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

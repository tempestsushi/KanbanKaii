import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
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
}

export function TicketModal({ ticket, isOpen, defaultStatus, onClose, onSave, onDelete, readOnly = false }: TicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [status, setStatus] = useState<TicketStatus>('Pending');
  const [source, setSource] = useState<TicketSource>('Manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  useEffect(() => {
    setTitle(ticket?.title ?? '');
    setDescription(ticket?.description ?? '');
    setAssignee(ticket?.assignee ?? '');
    setPriority(ticket?.priority ?? 'Medium');
    setStatus(ticket?.status ?? defaultStatus);
    setSource(ticket?.source ?? 'Manual');
  }, [ticket, defaultStatus, isOpen]);

  const submit = async () => {
    if (!title.trim() || !description.trim() || isSaving) return;
    setIsSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim() || 'Unassigned',
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{readOnly ? 'Ticket details' : ticket ? 'Edit ticket' : 'Create ticket'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="ticket-title">Title</Label>
            <Input id="ticket-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Add useful context and acceptance details" disabled={readOnly} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ticket-assignee">Assignee</Label>
              <Input id="ticket-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Name" disabled={readOnly} />
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: TicketPriority) => setPriority(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: TicketStatus) => setStatus(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(value: TicketSource) => setSource(value)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_SOURCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {ticket && !readOnly && <Button variant="destructive" className="sm:mr-auto" disabled={isSaving || isDeleting} onClick={() => setDeleteConfirmationOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          <Button variant="outline" disabled={isSaving || isDeleting} onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button disabled={!title.trim() || !description.trim() || isSaving || isDeleting} onClick={() => void submit()}>{isSaving ? (ticket ? 'Saving…' : 'Creating…') : ticket ? 'Save changes' : 'Create ticket'}</Button>}
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

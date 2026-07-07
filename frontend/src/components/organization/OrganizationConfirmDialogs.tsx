import type { Organization } from '@/api/organizations';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrganizationConfirmDialogsProps {
  organization: Organization;
  deleteDialogOpen: boolean;
  deleteConfirmation: string;
  isDeletingOrganization: boolean;
  leaveDialogOpen: boolean;
  isLeavingOrganization: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteOrganization: () => void;
  onLeaveDialogOpenChange: (open: boolean) => void;
  onLeaveOrganization: () => void;
}

export function OrganizationConfirmDialogs({
  organization,
  deleteDialogOpen,
  deleteConfirmation,
  isDeletingOrganization,
  leaveDialogOpen,
  isLeavingOrganization,
  onDeleteDialogOpenChange,
  onDeleteConfirmationChange,
  onDeleteOrganization,
  onLeaveDialogOpenChange,
  onLeaveOrganization,
}: OrganizationConfirmDialogsProps) {
  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingOrganization) return;
          onDeleteDialogOpenChange(open);
          if (!open) onDeleteConfirmationChange('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {organization.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the organization, memberships, and pending invitations.
              Existing organization tickets must be resolved first. Type{' '}
              <span className="font-semibold text-slate-700">{organization.slug}</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-organization-confirmation">Organization slug</Label>
            <Input
              id="delete-organization-confirmation"
              value={deleteConfirmation}
              onChange={(event) => onDeleteConfirmationChange(event.target.value)}
              placeholder={organization.slug}
              autoComplete="off"
              disabled={isDeletingOrganization}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOrganization}>Keep organization</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmation !== organization.slug || isDeletingOrganization}
              onClick={(event) => {
                event.preventDefault();
                onDeleteOrganization();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingOrganization ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!isLeavingOrganization) onLeaveDialogOpenChange(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {organization.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will immediately lose access to the organization board and member list.
              Existing shared ticket history will remain with the organization. Your private
              tickets and personal Slack connection will not be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingOrganization}>Stay in organization</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLeavingOrganization}
              onClick={(event) => {
                event.preventDefault();
                onLeaveOrganization();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isLeavingOrganization ? 'Leaving…' : 'Leave organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { Button } from '@/components/ui/button';

interface OrganizationMembershipPanelProps {
  isOwner: boolean;
  hasMembership: boolean;
  onOpenLeaveDialog: () => void;
}

export function OrganizationMembershipPanel({
  isOwner,
  hasMembership,
  onOpenLeaveDialog,
}: OrganizationMembershipPanelProps) {
  if (!hasMembership || isOwner) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Membership</h2>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Leave organization</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Remove your membership and access to this organization’s shared board.
          </p>
        </div>
        <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onOpenLeaveDialog}>
          Leave organization
        </Button>
      </div>
    </section>
  );
}

interface OrganizationDangerZoneProps {
  isOwner: boolean;
  onOpenDeleteDialog: () => void;
}

export function OrganizationDangerZone({ isOwner, onOpenDeleteDialog }: OrganizationDangerZoneProps) {
  if (!isOwner) return null;

  return (
    <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">Delete organization</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Permanently remove this organization, its memberships, and invitations.
          </p>
        </div>
        <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onOpenDeleteDialog}>
          Delete organization
        </Button>
      </div>
    </section>
  );
}

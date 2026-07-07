import type { FormEvent } from 'react';
import type { MyOrganizationInvitation, OrganizationInvite } from '@/api/organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AssignableRole } from '@/api/organizations';
import { organizationRoles, roleLabel } from './organization-ui';

interface PendingInvitationsProps {
  invitations: MyOrganizationInvitation[];
  respondingInviteId: string | null;
  onRespond: (inviteId: string, accept: boolean) => void;
}

export function PendingInvitationsPanel({ invitations, respondingInviteId, onRespond }: PendingInvitationsProps) {
  if (invitations.length === 0) return null;

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Your invitations</h2>
      <p className="mt-1 text-xs text-slate-500">Organizations that invited your signed-in email address.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {invitations.map((invite) => (
          <div key={invite.id} className="py-4">
            <p className="text-sm font-semibold text-slate-800">{invite.organization_name}</p>
            <p className="mt-1 text-xs text-slate-500">
              Invited as {roleLabel(invite.default_role)} · expires {new Date(invite.expires_at).toLocaleString()}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={respondingInviteId === invite.id} onClick={() => onRespond(invite.id, true)}>
                {respondingInviteId === invite.id ? 'Joining…' : 'Join organization'}
              </Button>
              <Button size="sm" variant="outline" disabled={respondingInviteId === invite.id} onClick={() => onRespond(invite.id, false)}>
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface InviteMembersProps {
  canInviteTeamLeads: boolean;
  inviteEmail: string;
  inviteRole: AssignableRole;
  invites: OrganizationInvite[];
  isSaving: boolean;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: AssignableRole) => void;
  onSubmit: (event: FormEvent) => void;
  onRevoke: (invite: OrganizationInvite) => void;
}

export function InviteMembersPanel({
  canInviteTeamLeads,
  inviteEmail,
  inviteRole,
  invites,
  isSaving,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onRevoke,
}: InviteMembersProps) {
  const availableRoles = organizationRoles.filter((role) => canInviteTeamLeads || role !== 'TEAM_LEAD');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Invite members</h2>
      <p className="mt-1 text-xs text-slate-500">The invitation will appear in the Organization tab for an account using this verified email.</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
        <Input type="email" value={inviteEmail} onChange={(event) => onEmailChange(event.target.value)} placeholder="member@company.com" required />
        <select value={inviteRole} onChange={(event) => onRoleChange(event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">
          {availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </select>
        <Button disabled={isSaving || !inviteEmail.trim()}>{isSaving ? 'Sending…' : 'Send invitation'}</Button>
      </form>
      <div className="mt-5 divide-y divide-slate-100">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-xs font-medium text-slate-700">{invite.intended_email} · {roleLabel(invite.default_role)}</p>
              <p className="mt-1 text-[10px] text-slate-400">Expires {new Date(invite.expires_at).toLocaleString()}</p>
            </div>
            {!invite.accepted_at && !invite.revoked_at && !invite.declined_at && (
              <button className="text-xs font-semibold text-red-500" onClick={() => onRevoke(invite)}>Revoke</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

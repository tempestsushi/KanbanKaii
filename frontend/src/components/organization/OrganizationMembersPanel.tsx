import type { AssignableRole, OrganizationMember } from '@/api/organizations';
import { organizationRoles, roleLabel } from './organization-ui';

interface OrganizationMembersPanelProps {
  members: OrganizationMember[];
  currentUserId?: string;
  isOwner: boolean;
  currentRole?: string;
  confirmRemove: string | null;
  onRoleChange: (member: OrganizationMember, role: AssignableRole) => void;
  onConfirmRemoveChange: (userId: string | null) => void;
  onRemoveMember: (userId: string) => void;
}

export function OrganizationMembersPanel({
  members,
  currentUserId,
  isOwner,
  currentRole,
  confirmRemove,
  onRoleChange,
  onConfirmRemoveChange,
  onRemoveMember,
}: OrganizationMembersPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Members <span className="text-slate-400">{members.length}</span></h2>
      <div className="mt-4 divide-y divide-slate-100">
        {members.map((member) => {
          const manageable =
            member.role !== 'OWNER'
            && member.user_id !== currentUserId
            && (isOwner || (currentRole === 'TEAM_LEAD' && ['MEMBER', 'VIEWER'].includes(member.role)));
          return (
            <div key={member.user_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {member.display_name.trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-700">{member.display_name}{member.user_id === currentUserId ? ' (You)' : ''}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {member.job_title ? `${member.job_title} · ` : ''}Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {manageable ? (
                  <select value={member.role} onChange={(event) => onRoleChange(member, event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
                    {organizationRoles.filter((role) => isOwner || role !== 'TEAM_LEAD').map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                  </select>
                ) : (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{roleLabel(member.role)}</span>
                )}
                {manageable && (
                  confirmRemove === member.user_id ? (
                    <>
                      <button className="text-xs font-semibold text-red-600" onClick={() => onRemoveMember(member.user_id)}>Confirm</button>
                      <button className="text-xs text-slate-500" onClick={() => onConfirmRemoveChange(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => onConfirmRemoveChange(member.user_id)}>Remove</button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

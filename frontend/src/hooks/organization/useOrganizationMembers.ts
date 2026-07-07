import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  changeOrganizationMemberRole,
  removeOrganizationMember,
  type AssignableRole,
  type Organization,
  type OrganizationMember,
} from '@/api/organizations';

type OrganizationMembersOptions = {
  organization: Organization | null;
  setConfirmRemove: (userId: string | null) => void;
  setMembers: Dispatch<SetStateAction<OrganizationMember[]>>;
};

export function useOrganizationMembers({
  organization,
  setConfirmRemove,
  setMembers,
}: OrganizationMembersOptions) {
  const changeRole = async (member: OrganizationMember, role: AssignableRole) => {
    if (!organization) return;
    try {
      const updated = await changeOrganizationMemberRole(organization.id, member.user_id, role);
      setMembers((items) => items.map((item) => item.user_id === updated.user_id ? updated : item));
      toast.success('Member role updated');
    } catch (roleError) {
      toast.error(roleError instanceof Error ? roleError.message : 'Could not update role');
    }
  };

  const removeMember = async (userId: string) => {
    if (!organization) return;
    try {
      await removeOrganizationMember(organization.id, userId);
      setMembers((items) => items.filter((item) => item.user_id !== userId));
      setConfirmRemove(null);
      toast.success('Member removed');
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : 'Could not remove member');
    }
  };

  return { changeRole, removeMember };
}

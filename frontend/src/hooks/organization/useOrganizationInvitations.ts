import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  acceptMyOrganizationInvitation,
  createOrganizationInvite,
  declineMyOrganizationInvitation,
  listOrganizationInvites,
  revokeOrganizationInvite,
  type AssignableRole,
  type MyOrganizationInvitation,
  type Organization,
  type OrganizationInvite,
} from '@/api/organizations';

type OrganizationInvitationsOptions = {
  loadOrganization: () => Promise<void>;
  organization: Organization | null;
  setInvites: Dispatch<SetStateAction<OrganizationInvite[]>>;
  setIsSaving: (isSaving: boolean) => void;
  setMyInvitations: Dispatch<SetStateAction<MyOrganizationInvitation[]>>;
};

export function useOrganizationInvitations({
  loadOrganization,
  organization,
  setInvites,
  setIsSaving,
  setMyInvitations,
}: OrganizationInvitationsOptions) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('MEMBER');
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    try {
      const invite = await createOrganizationInvite(organization.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInvites(await listOrganizationInvites(organization.id));
      toast.success(`Invitation sent to ${invite.intended_email}`);
    } catch (inviteError) {
      toast.error(inviteError instanceof Error ? inviteError.message : 'Could not create invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const revokeInvite = async (invite: OrganizationInvite) => {
    if (!organization) return;
    try {
      await revokeOrganizationInvite(organization.id, invite.id);
      setInvites((items) => items.filter((item) => item.id !== invite.id));
      toast.success('Invitation revoked');
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not revoke invitation');
    }
  };

  const respondToInvitation = async (inviteId: string, accept: boolean) => {
    setRespondingInviteId(inviteId);
    try {
      if (accept) {
        await acceptMyOrganizationInvitation(inviteId);
        toast.success('Organization joined');
        await loadOrganization();
      } else {
        await declineMyOrganizationInvitation(inviteId);
        setMyInvitations((items) => items.filter((item) => item.id !== inviteId));
        toast.success('Invitation declined');
      }
    } catch (responseError) {
      toast.error(responseError instanceof Error ? responseError.message : 'Could not respond to invitation');
    } finally {
      setRespondingInviteId(null);
    }
  };

  return {
    createInvite,
    inviteEmail,
    inviteRole,
    respondToInvitation,
    respondingInviteId,
    revokeInvite,
    setInviteEmail,
    setInviteRole,
  };
}

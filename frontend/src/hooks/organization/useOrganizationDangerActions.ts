import { useState } from 'react';
import { toast } from 'sonner';
import {
  deleteOrganization,
  leaveOrganization,
  type Organization,
  type OrganizationInvite,
  type OrganizationMember,
} from '@/api/organizations';

type OrganizationDangerActionsOptions = {
  isOwner: boolean;
  loadOrganization: () => Promise<void>;
  organization: Organization | null;
  setInvites: (invites: OrganizationInvite[]) => void;
  setMembers: (members: OrganizationMember[]) => void;
  setOrganization: (organization: Organization | null) => void;
};

export function useOrganizationDangerActions({
  isOwner,
  loadOrganization,
  organization,
  setInvites,
  setMembers,
  setOrganization,
}: OrganizationDangerActionsOptions) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeavingOrganization, setIsLeavingOrganization] = useState(false);

  const removeOrganization = async () => {
    if (!organization || deleteConfirmation !== organization.slug) return;
    setIsDeletingOrganization(true);
    try {
      await deleteOrganization(organization.id, deleteConfirmation);
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
      setOrganization(null);
      setMembers([]);
      setInvites([]);
      toast.success('Organization deleted');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Could not delete organization');
    } finally {
      setIsDeletingOrganization(false);
    }
  };

  const leaveCurrentOrganization = async () => {
    if (!organization || isOwner) return;
    setIsLeavingOrganization(true);
    try {
      await leaveOrganization(organization.id);
      setLeaveDialogOpen(false);
      toast.success(`You left ${organization.name}`);
      await loadOrganization();
    } catch (leaveError) {
      toast.error(leaveError instanceof Error ? leaveError.message : 'Could not leave the organization');
    } finally {
      setIsLeavingOrganization(false);
    }
  };

  return {
    deleteConfirmation,
    deleteDialogOpen,
    isDeletingOrganization,
    isLeavingOrganization,
    leaveCurrentOrganization,
    leaveDialogOpen,
    removeOrganization,
    setDeleteConfirmation,
    setDeleteDialogOpen,
    setLeaveDialogOpen,
  };
}

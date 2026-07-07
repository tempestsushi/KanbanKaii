import { useCallback, useEffect } from 'react';
import {
  listMyOrganizationInvitations,
  listOrganizationBoardMembers,
  listOrganizationBoardSlackChannels,
  listOrganizationBoards,
  listOrganizationInvites,
  listOrganizationMembers,
  listOrganizations,
  type MyOrganizationInvitation,
  type Organization,
  type OrganizationBoard,
  type OrganizationBoardMember,
  type OrganizationBoardSlackChannel,
  type OrganizationInvite,
  type OrganizationMember,
} from '@/api/organizations';
import { getOrganizationSlackStatus, type OrganizationSlackBindingStatus } from '@/integrations/slack/api';
import { disconnectedSlackBinding } from './organizationConstants';

type OrganizationLoaderOptions = {
  userId?: string;
  setBoardMembers: (members: OrganizationBoardMember[]) => void;
  setBoards: (boards: OrganizationBoard[]) => void;
  setBoardSlackChannels: (channels: OrganizationBoardSlackChannel[]) => void;
  setError: (error: string | null) => void;
  setInvites: (invites: OrganizationInvite[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMembers: (members: OrganizationMember[]) => void;
  setMyInvitations: (invitations: MyOrganizationInvitation[]) => void;
  setOrganization: (organization: Organization | null) => void;
  setSelectedBoardId: (boardId: string | null) => void;
  setSlackBinding: (binding: OrganizationSlackBindingStatus) => void;
};

export function useOrganizationLoader({
  userId,
  setBoardMembers,
  setBoards,
  setBoardSlackChannels,
  setError,
  setInvites,
  setIsLoading,
  setMembers,
  setMyInvitations,
  setOrganization,
  setSelectedBoardId,
  setSlackBinding,
}: OrganizationLoaderOptions) {
  const loadOrganization = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [organizations, pendingInvitations] = await Promise.all([
        listOrganizations(),
        listMyOrganizationInvitations(),
      ]);
      setMyInvitations(pendingInvitations);
      const active = organizations[0] ?? null;
      setOrganization(active);
      if (!active) {
        setMembers([]);
        setBoards([]);
        setSelectedBoardId(null);
        setBoardMembers([]);
        setBoardSlackChannels([]);
        setInvites([]);
        setSlackBinding(disconnectedSlackBinding);
        return;
      }

      const [loadedMembers, loadedBoards] = await Promise.all([
        listOrganizationMembers(active.id),
        listOrganizationBoards(active.id),
      ]);
      setMembers(loadedMembers);
      setBoards(loadedBoards);

      const nextBoardId = loadedBoards[0]?.id ?? null;
      setSelectedBoardId(nextBoardId);
      const [loadedBoardMembers, loadedBoardSlackChannels] = nextBoardId
        ? await Promise.all([
            listOrganizationBoardMembers(active.id, nextBoardId),
            listOrganizationBoardSlackChannels(active.id, nextBoardId),
          ])
        : [[], []];
      setBoardMembers(loadedBoardMembers);
      setBoardSlackChannels(loadedBoardSlackChannels);

      const role = loadedMembers.find((member) => member.user_id === userId)?.role;
      setInvites(role === 'OWNER' || role === 'TEAM_LEAD' ? await listOrganizationInvites(active.id) : []);
      setSlackBinding(await getOrganizationSlackStatus(active.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    setBoardMembers,
    setBoards,
    setBoardSlackChannels,
    setError,
    setInvites,
    setIsLoading,
    setMembers,
    setMyInvitations,
    setOrganization,
    setSelectedBoardId,
    setSlackBinding,
  ]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

  return { loadOrganization };
}

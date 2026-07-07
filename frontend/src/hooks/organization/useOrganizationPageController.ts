import { useMemo, useState } from 'react';
import {
  type MyOrganizationInvitation,
  type Organization,
  type OrganizationBoard,
  type OrganizationBoardMember,
  type OrganizationBoardSlackChannel,
  type OrganizationInvite,
  type OrganizationMember,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { useOrganizationBoards } from './useOrganizationBoards';
import { useOrganizationDangerActions } from './useOrganizationDangerActions';
import { useOrganizationForm } from './useOrganizationForm';
import { useOrganizationInvitations } from './useOrganizationInvitations';
import { useOrganizationLoader } from './useOrganizationLoader';
import { useOrganizationMembers } from './useOrganizationMembers';
import { useOrganizationSlackConnection } from './useOrganizationSlackConnection';

export function useOrganizationPageController() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [boards, setBoards] = useState<OrganizationBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [boardMembers, setBoardMembers] = useState<OrganizationBoardMember[]>([]);
  const [boardSlackChannels, setBoardSlackChannels] = useState<OrganizationBoardSlackChannel[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [myInvitations, setMyInvitations] = useState<MyOrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState<string | null>(null);
  const [confirmBoardMemberRemove, setConfirmBoardMemberRemove] = useState<string | null>(null);
  const [confirmSlackChannelRemove, setConfirmSlackChannelRemove] = useState<string | null>(null);
  const [showSlackChannelForm, setShowSlackChannelForm] = useState(false);

  const currentMembership = useMemo(
    () => members.find((member) => member.user_id === user?.id),
    [members, user?.id],
  );
  const canLead = currentMembership?.role === 'OWNER' || currentMembership?.role === 'TEAM_LEAD';
  const isOwner = currentMembership?.role === 'OWNER';
  const canCreateBoards = isOwner;
  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  );
  const selectedBoardMembership = useMemo(
    () => boardMembers.find((member) => member.user_id === user?.id),
    [boardMembers, user?.id],
  );
  const canManageSelectedBoard = isOwner || selectedBoardMembership?.role === 'MANAGER';
  const boardMemberIds = useMemo(
    () => new Set(boardMembers.map((member) => member.user_id)),
    [boardMembers],
  );
  const availableBoardMembers = useMemo(
    () => members.filter((member) => !boardMemberIds.has(member.user_id)),
    [boardMemberIds, members],
  );

  const slackConnection = useOrganizationSlackConnection({ isOwner, organization });

  const { loadOrganization } = useOrganizationLoader({
    userId: user?.id,
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
    setSlackBinding: slackConnection.setSlackBinding,
  });

  const organizationForm = useOrganizationForm({
    loadOrganization,
    setError,
    setIsSaving,
  });

  const invitations = useOrganizationInvitations({
    loadOrganization,
    organization,
    setInvites,
    setIsSaving,
    setMyInvitations,
  });

  const boardsController = useOrganizationBoards({
    canCreateBoards,
    organization,
    selectedBoard,
    setBoardMembers,
    setBoards,
    setBoardSlackChannels,
    setConfirmBoardDelete,
    setConfirmBoardMemberRemove,
    setConfirmSlackChannelRemove,
    setIsSaving,
    setSelectedBoardId,
    setShowSlackChannelForm,
    slackBinding: slackConnection.slackBinding,
  });

  const membersController = useOrganizationMembers({
    organization,
    setConfirmRemove,
    setMembers,
  });

  const dangerActions = useOrganizationDangerActions({
    isOwner,
    loadOrganization,
    organization,
    setInvites,
    setMembers,
    setOrganization,
  });

  return {
    ...boardsController,
    ...dangerActions,
    ...invitations,
    ...membersController,
    ...organizationForm,
    ...slackConnection,
    availableBoardMembers,
    boardMembers,
    boardSlackChannels,
    boards,
    canCreateBoards,
    canLead,
    canManageSelectedBoard,
    confirmBoardDelete,
    confirmBoardMemberRemove,
    confirmRemove,
    confirmSlackChannelRemove,
    currentMembership,
    error,
    invites,
    isLoading,
    isOwner,
    isSaving,
    members,
    myInvitations,
    organization,
    selectedBoard,
    selectedBoardId,
    setConfirmBoardDelete,
    setConfirmBoardMemberRemove,
    setConfirmRemove,
    setConfirmSlackChannelRemove,
    setShowSlackChannelForm,
    showSlackChannelForm,
    user,
  };
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  changeOrganizationMemberRole,
  acceptMyOrganizationInvitation,
  addOrganizationBoardMember,
  addOrganizationBoardSlackChannel,
  changeOrganizationBoardMemberRole,
  createOrganization,
  createOrganizationBoard,
  createOrganizationInvite,
  deleteOrganizationBoard,
  deleteOrganization,
  declineMyOrganizationInvitation,
  listOrganizationBoardMembers,
  listOrganizationBoardSlackChannels,
  listOrganizationBoards,
  listOrganizationInvites,
  listOrganizationMembers,
  listOrganizations,
  listMyOrganizationInvitations,
  leaveOrganization,
  removeOrganizationBoardMember,
  removeOrganizationBoardSlackChannel,
  removeOrganizationMember,
  revokeOrganizationInvite,
  type AssignableRole,
  type Organization,
  type OrganizationBoard,
  type OrganizationBoardMember,
  type OrganizationBoardSlackChannel,
  type OrganizationBoardRole,
  type OrganizationInvite,
  type OrganizationMember,
  type MyOrganizationInvitation,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  getOrganizationSlackStatus,
  startSlackConnection,
  type OrganizationSlackBindingStatus,
} from '@/integrations/slack/api';

const roles: AssignableRole[] = ['TEAM_LEAD', 'MEMBER', 'VIEWER'];
const boardRoles: OrganizationBoardRole[] = ['MANAGER', 'MEMBER', 'VIEWER'];
const roleLabel = (role: string) => {
  if (role === 'OWNER') return 'Manager';
  return role.replace('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
};
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);

export function OrganizationPage() {
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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardSlug, setBoardSlug] = useState('');
  const [boardSlugEdited, setBoardSlugEdited] = useState(false);
  const [boardMemberUserId, setBoardMemberUserId] = useState('');
  const [boardMemberRole, setBoardMemberRole] = useState<OrganizationBoardRole>('MEMBER');
  const [slackChannelId, setSlackChannelId] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('');
  const [showSlackChannelForm, setShowSlackChannelForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('MEMBER');
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState<string | null>(null);
  const [confirmBoardMemberRemove, setConfirmBoardMemberRemove] = useState<string | null>(null);
  const [confirmSlackChannelRemove, setConfirmSlackChannelRemove] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeavingOrganization, setIsLeavingOrganization] = useState(false);
  const [slackBinding, setSlackBinding] = useState<OrganizationSlackBindingStatus>({
    connected: false,
    workspace_name: null,
    slack_team_id: null,
    verified_at: null,
  });
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);

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
        setSlackBinding({ connected: false, workspace_name: null, slack_team_id: null, verified_at: null });
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
      const role = loadedMembers.find((member) => member.user_id === user?.id)?.role;
      setInvites(role === 'OWNER' || role === 'TEAM_LEAD' ? await listOrganizationInvites(active.id) : []);
      setSlackBinding(await getOrganizationSlackStatus(active.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const result = query.get('slack');
    if (result === 'organization_connected') {
      toast.success('Slack workspace verified and connected to the organization');
    } else if (result === 'error') {
      const reason = query.get('reason');
      toast.error(reason === 'workspace_owner_required'
        ? 'Slack connection requires a Slack workspace owner account'
        : `Slack connection failed: ${reason ?? 'unknown error'}`);
    }
    if (result) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const submitOrganization = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await createOrganization(name.trim(), slug.trim());
      toast.success('Organization created');
      await loadOrganization();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create organization');
    } finally {
      setIsSaving(false);
    }
  };

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

  const selectBoard = async (boardId: string) => {
    if (!organization) return;
    setSelectedBoardId(boardId);
    setConfirmBoardDelete(null);
    setConfirmBoardMemberRemove(null);
    setConfirmSlackChannelRemove(null);
    setShowSlackChannelForm(false);
    try {
      const [loadedBoardMembers, loadedBoardSlackChannels] = await Promise.all([
        listOrganizationBoardMembers(organization.id, boardId),
        listOrganizationBoardSlackChannels(organization.id, boardId),
      ]);
      setBoardMembers(loadedBoardMembers);
      setBoardSlackChannels(loadedBoardSlackChannels);
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not load board members');
    }
  };

  const createBoard = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization || !canCreateBoards) return;
    setIsSaving(true);
    try {
      const board = await createOrganizationBoard(
        organization.id,
        boardName.trim(),
        boardSlug.trim(),
      );
      setBoardName('');
      setBoardSlug('');
      setBoardSlugEdited(false);
      const loadedBoards = await listOrganizationBoards(organization.id);
      setBoards(loadedBoards);
      setSelectedBoardId(board.id);
      setBoardMembers(await listOrganizationBoardMembers(organization.id, board.id));
      setBoardSlackChannels(await listOrganizationBoardSlackChannels(organization.id, board.id));
      toast.success('Project board created');
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not create board');
    } finally {
      setIsSaving(false);
    }
  };

  const addBoardMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization || !selectedBoard || !boardMemberUserId) return;
    setIsSaving(true);
    try {
      await addOrganizationBoardMember(
        organization.id,
        selectedBoard.id,
        boardMemberUserId,
        boardMemberRole,
      );
      setBoardMemberUserId('');
      setBoardMemberRole('MEMBER');
      setBoardMembers(await listOrganizationBoardMembers(organization.id, selectedBoard.id));
      toast.success('Board member added');
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not add board member');
    } finally {
      setIsSaving(false);
    }
  };

  const changeBoardRole = async (member: OrganizationBoardMember, role: OrganizationBoardRole) => {
    if (!organization || !selectedBoard) return;
    try {
      const updated = await changeOrganizationBoardMemberRole(
        organization.id,
        selectedBoard.id,
        member.user_id,
        role,
      );
      setBoardMembers((items) => items.map((item) => item.user_id === updated.user_id ? updated : item));
      toast.success('Board role updated');
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not update board role');
    }
  };

  const removeBoardMember = async (userId: string) => {
    if (!organization || !selectedBoard) return;
    try {
      await removeOrganizationBoardMember(organization.id, selectedBoard.id, userId);
      setBoardMembers((items) => items.filter((item) => item.user_id !== userId));
      setConfirmBoardMemberRemove(null);
      toast.success('Board member removed');
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not remove board member');
    }
  };

  const addSlackChannelMapping = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization || !selectedBoard || !slackBinding.slack_team_id) return;
    setIsSaving(true);
    try {
      await addOrganizationBoardSlackChannel(
        organization.id,
        selectedBoard.id,
        slackBinding.slack_team_id,
        slackChannelId.trim(),
        slackChannelName.trim() || undefined,
      );
      setSlackChannelId('');
      setSlackChannelName('');
      setShowSlackChannelForm(false);
      setBoardSlackChannels(await listOrganizationBoardSlackChannels(organization.id, selectedBoard.id));
      toast.success('Slack channel linked to project board');
    } catch (channelError) {
      toast.error(channelError instanceof Error ? channelError.message : 'Could not link Slack channel');
    } finally {
      setIsSaving(false);
    }
  };

  const removeSlackChannelMapping = async (channel: OrganizationBoardSlackChannel) => {
    if (!organization || !selectedBoard) return;
    try {
      await removeOrganizationBoardSlackChannel(
        organization.id,
        selectedBoard.id,
        channel.slack_team_id,
        channel.slack_channel_id,
      );
      setBoardSlackChannels((items) =>
        items.filter((item) =>
          item.slack_team_id !== channel.slack_team_id
          || item.slack_channel_id !== channel.slack_channel_id,
        ),
      );
      setConfirmSlackChannelRemove(null);
      toast.success('Slack channel unlinked');
    } catch (channelError) {
      toast.error(channelError instanceof Error ? channelError.message : 'Could not unlink Slack channel');
    }
  };

  const removeBoard = async (boardId: string) => {
    if (!organization) return;
    try {
      await deleteOrganizationBoard(organization.id, boardId);
      const loadedBoards = await listOrganizationBoards(organization.id);
      const nextBoardId = loadedBoards[0]?.id ?? null;
      setBoards(loadedBoards);
      setSelectedBoardId(nextBoardId);
      const [loadedBoardMembers, loadedBoardSlackChannels] = nextBoardId
        ? await Promise.all([
            listOrganizationBoardMembers(organization.id, nextBoardId),
            listOrganizationBoardSlackChannels(organization.id, nextBoardId),
          ])
        : [[], []];
      setBoardMembers(loadedBoardMembers);
      setBoardSlackChannels(loadedBoardSlackChannels);
      setConfirmBoardDelete(null);
      toast.success('Project board deleted');
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : 'Could not delete board');
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
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete organization',
      );
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
      toast.error(
        leaveError instanceof Error
          ? leaveError.message
          : 'Could not leave the organization',
      );
    } finally {
      setIsLeavingOrganization(false);
    }
  };

  const connectOrganizationSlack = async () => {
    if (!organization || !isOwner || isConnectingSlack) return;
    setIsConnectingSlack(true);
    try {
      window.location.assign(await startSlackConnection(organization.id));
    } catch (connectError) {
      toast.error(connectError instanceof Error ? connectError.message : 'Could not connect Slack');
      setIsConnectingSlack(false);
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading organization…</div>;

  if (!organization) {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-5 sm:p-8">
          {myInvitations.length > 0 && <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-slate-800">Your invitations</h2><p className="mt-1 text-xs text-slate-500">Organizations that invited your signed-in email address.</p><div className="mt-4 divide-y divide-slate-100">{myInvitations.map((invite) => <div key={invite.id} className="py-4"><p className="text-sm font-semibold text-slate-800">{invite.organization_name}</p><p className="mt-1 text-xs text-slate-500">Invited as {roleLabel(invite.default_role)} · expires {new Date(invite.expires_at).toLocaleString()}</p><div className="mt-3 flex gap-2"><Button size="sm" disabled={respondingInviteId === invite.id} onClick={() => void respondToInvitation(invite.id, true)}>{respondingInviteId === invite.id ? 'Joining…' : 'Join organization'}</Button><Button size="sm" variant="outline" disabled={respondingInviteId === invite.id} onClick={() => void respondToInvitation(invite.id, false)}>Decline</Button></div></div>)}</div></section>}
          <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create your organization</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Create the workspace that will contain formal assignments, members and roles.</p>
          <form onSubmit={submitOrganization} className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2"><Label htmlFor="organization-name">Name</Label><Input id="organization-name" value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!slugEdited) setSlug(slugify(value)); }} placeholder="Acme Engineering" required /></div>
            <div className="space-y-2"><Label htmlFor="organization-slug">Organization URL name</Label><Input id="organization-slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} placeholder="acme-engineering" required minLength={2} /></div>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button disabled={isSaving || name.trim().length < 2 || slug.length < 2}>{isSaving ? 'Creating…' : 'Create organization'}</Button>
          </form>
          </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
        <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{currentMembership ? roleLabel(currentMembership.role) : 'Member'}</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{organization.name}</h1><p className="mt-1 text-sm text-slate-500">Manage membership and invitation access for this workspace.</p></section>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {myInvitations.length > 0 && <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-slate-800">Your invitations</h2><div className="mt-4 divide-y divide-slate-100">{myInvitations.map((invite) => <div key={invite.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{invite.organization_name}</p><p className="mt-1 text-xs text-slate-500">Invited as {roleLabel(invite.default_role)} · expires {new Date(invite.expires_at).toLocaleString()}</p></div><div className="flex gap-2"><Button size="sm" disabled={respondingInviteId === invite.id} onClick={() => void respondToInvitation(invite.id, true)}>Join</Button><Button size="sm" variant="outline" disabled={respondingInviteId === invite.id} onClick={() => void respondToInvitation(invite.id, false)}>Decline</Button></div></div>)}</div></section>}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">Organization Slack workspace</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${slackBinding.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {slackBinding.connected ? 'Verified' : 'Not connected'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {slackBinding.connected
                  ? `${slackBinding.workspace_name} · ${slackBinding.slack_team_id}`
                  : 'Bind the formal organization board to one verified Slack workspace.'}
              </p>
              {!isOwner && !slackBinding.connected && <p className="mt-1 text-[11px] text-slate-400">Only the organization owner can establish this connection.</p>}
            </div>
            {isOwner && <Button type="button" variant="outline" disabled={isConnectingSlack} onClick={() => void connectOrganizationSlack()}>{isConnectingSlack ? 'Opening Slack…' : slackBinding.connected ? 'Reverify workspace' : 'Connect workspace'}</Button>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Project boards</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Split organization work into focused boards. A manager can keep a leadership board private to only the team leads who belong to it.
              </p>
            </div>
            {canCreateBoards && (
              <form onSubmit={createBoard} className="grid gap-2 sm:min-w-[420px] sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={boardName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBoardName(value);
                    if (!boardSlugEdited) setBoardSlug(slugify(value));
                  }}
                  placeholder="Frontend Revamp"
                  required
                />
                <Input
                  value={boardSlug}
                  onChange={(event) => {
                    setBoardSlugEdited(true);
                    setBoardSlug(slugify(event.target.value));
                  }}
                  placeholder="frontend-revamp"
                  required
                  minLength={2}
                />
                <Button disabled={isSaving || boardName.trim().length < 2 || boardSlug.length < 2}>
                  {isSaving ? 'Saving…' : 'Create board'}
                </Button>
              </form>
            )}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
              {boards.length === 0 ? (
                <p className="p-3 text-xs leading-5 text-slate-500">
                  No project boards yet. Create one for a project, leadership channel, or client workstream.
                </p>
              ) : (
                <div className="space-y-1">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => void selectBoard(board.id)}
                      className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${selectedBoardId === board.id ? 'bg-white font-semibold text-violet-700 shadow-sm' : 'text-slate-600 hover:bg-white/80'}`}
                    >
                      <span className="block truncate">{board.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-normal text-slate-400">{board.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              {!selectedBoard ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">Select or create a board</p>
                  <p className="mt-1 text-xs text-slate-500">Board members will control who can see board-scoped tickets.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{selectedBoard.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {boardMembers.length} board member{boardMembers.length === 1 ? '' : 's'} · Created {new Date(selectedBoard.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canManageSelectedBoard && (
                      confirmBoardDelete === selectedBoard.id ? (
                        <div className="flex items-center gap-2">
                          <button className="text-xs font-semibold text-red-600" onClick={() => void removeBoard(selectedBoard.id)}>Confirm delete</button>
                          <button className="text-xs text-slate-500" onClick={() => setConfirmBoardDelete(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => setConfirmBoardDelete(selectedBoard.id)}>Delete board</button>
                      )
                    )}
                  </div>

                  {canManageSelectedBoard && (
                    <form onSubmit={addBoardMember} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                      <select
                        value={boardMemberUserId}
                        onChange={(event) => setBoardMemberUserId(event.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                        required
                      >
                        <option value="">Add organization member</option>
                        {availableBoardMembers.map((member) => (
                          <option key={member.user_id} value={member.user_id}>{member.display_name} · {roleLabel(member.role)}</option>
                        ))}
                      </select>
                      <select
                        value={boardMemberRole}
                        onChange={(event) => setBoardMemberRole(event.target.value as OrganizationBoardRole)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                      >
                        {boardRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                      </select>
                      <Button disabled={isSaving || !boardMemberUserId}>Add member</Button>
                    </form>
                  )}

                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700">Slack channels connected to this board</h4>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          When a manager or board lead assigns work from a connected Slack channel, KanbanKaii saves the ticket inside this project board.
                        </p>
                      </div>
                      {canManageSelectedBoard && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!slackBinding.connected || !slackBinding.slack_team_id}
                          onClick={() => setShowSlackChannelForm((visible) => !visible)}
                        >
                          {showSlackChannelForm ? 'Cancel' : 'Connect Slack channel'}
                        </Button>
                      )}
                    </div>

                    {slackBinding.connected && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                          Workspace: {slackBinding.workspace_name ?? slackBinding.slack_team_id}
                        </span>
                        <span>Team ID: {slackBinding.slack_team_id}</span>
                      </div>
                    )}

                    {showSlackChannelForm && canManageSelectedBoard && slackBinding.connected && slackBinding.slack_team_id && (
                      <form onSubmit={addSlackChannelMapping} className="mt-4 rounded-lg border border-violet-100 bg-white p-3">
                        <p className="mb-3 text-[11px] leading-5 text-slate-500">
                          Paste the Slack channel ID for the public/private channel you want mapped to this board.
                          In Slack, open the channel details and copy the channel ID, usually starting with <span className="font-semibold text-slate-700">C</span> or <span className="font-semibold text-slate-700">G</span>.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={slackChannelId}
                            onChange={(event) => setSlackChannelId(event.target.value)}
                            placeholder="Channel ID, e.g. C0123ABC"
                            required
                          />
                          <Input
                            value={slackChannelName}
                            onChange={(event) => setSlackChannelName(event.target.value)}
                            placeholder="Optional display name"
                          />
                          <Button disabled={isSaving || !slackChannelId.trim()}>
                            Save channel
                          </Button>
                        </div>
                      </form>
                    )}

                    {!slackBinding.connected && (
                      <p className="mt-3 rounded-md bg-white px-3 py-2 text-[11px] text-slate-500">
                        Connect the organization Slack workspace above before linking channels to project boards.
                      </p>
                    )}

                    <div className="mt-3 divide-y divide-slate-200/80">
                      {boardSlackChannels.map((channel) => {
                        const key = `${channel.slack_team_id}:${channel.slack_channel_id}`;
                        return (
                          <div key={key} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-700">
                                {channel.slack_channel_name || channel.slack_channel_id}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {channel.slack_team_id} · {channel.slack_channel_id}
                              </p>
                            </div>
                            {canManageSelectedBoard && (
                              confirmSlackChannelRemove === key ? (
                                <div className="flex gap-2">
                                  <button className="text-xs font-semibold text-red-600" onClick={() => void removeSlackChannelMapping(channel)}>Confirm</button>
                                  <button className="text-xs text-slate-500" onClick={() => setConfirmSlackChannelRemove(null)}>Cancel</button>
                                </div>
                              ) : (
                                <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => setConfirmSlackChannelRemove(key)}>Unlink</button>
                              )
                            )}
                          </div>
                        );
                      })}
                      {boardSlackChannels.length === 0 && (
                        <p className="py-3 text-center text-[11px] text-slate-500">
                          No Slack channels linked to this board yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {boardMembers.map((member) => {
                      const canManageBoardMember = canManageSelectedBoard && member.user_id !== user?.id;
                      return (
                        <div key={member.user_id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                                {member.display_name.trim().slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-700">{member.display_name}{member.user_id === user?.id ? ' (You)' : ''}</p>
                              <p className="mt-1 text-xs text-slate-400">{member.job_title ?? 'Board member'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canManageBoardMember ? (
                              <select
                                value={member.role}
                                onChange={(event) => void changeBoardRole(member, event.target.value as OrganizationBoardRole)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
                              >
                                {boardRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                              </select>
                            ) : (
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{roleLabel(member.role)}</span>
                            )}
                            {canManageBoardMember && (
                              confirmBoardMemberRemove === member.user_id ? (
                                <>
                                  <button className="text-xs font-semibold text-red-600" onClick={() => void removeBoardMember(member.user_id)}>Confirm</button>
                                  <button className="text-xs text-slate-500" onClick={() => setConfirmBoardMemberRemove(null)}>Cancel</button>
                                </>
                              ) : (
                                <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => setConfirmBoardMemberRemove(member.user_id)}>Remove</button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {boardMembers.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No board members yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Members <span className="text-slate-400">{members.length}</span></h2>
          <div className="mt-4 divide-y divide-slate-100">
            {members.map((member) => {
              const manageable = member.role !== 'OWNER' && member.user_id !== user?.id && (isOwner || (currentMembership?.role === 'TEAM_LEAD' && ['MEMBER', 'VIEWER'].includes(member.role)));
              return <div key={member.user_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{member.display_name.trim().slice(0, 1).toUpperCase()}</div>}<div><p className="text-sm font-medium text-slate-700">{member.display_name}{member.user_id === user?.id ? ' (You)' : ''}</p><p className="mt-1 text-xs text-slate-400">{member.job_title ? `${member.job_title} · ` : ''}Joined {new Date(member.joined_at).toLocaleDateString()}</p></div></div><div className="flex items-center gap-2">{manageable ? <select value={member.role} onChange={(event) => void changeRole(member, event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">{roles.filter((role) => isOwner || role !== 'TEAM_LEAD').map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select> : <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{roleLabel(member.role)}</span>}{manageable && (confirmRemove === member.user_id ? <><button className="text-xs font-semibold text-red-600" onClick={() => void removeMember(member.user_id)}>Confirm</button><button className="text-xs text-slate-500" onClick={() => setConfirmRemove(null)}>Cancel</button></> : <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => setConfirmRemove(member.user_id)}>Remove</button>)}</div></div>;
            })}
          </div>
        </section>

        {canLead && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-slate-800">Invite members</h2><p className="mt-1 text-xs text-slate-500">The invitation will appear in the Organization tab for an account using this verified email.</p><form onSubmit={createInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]"><Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@company.com" required /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">{roles.filter((role) => isOwner || role !== 'TEAM_LEAD').map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><Button disabled={isSaving || !inviteEmail.trim()}>{isSaving ? 'Sending…' : 'Send invitation'}</Button></form><div className="mt-5 divide-y divide-slate-100">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-xs font-medium text-slate-700">{invite.intended_email} · {roleLabel(invite.default_role)}</p><p className="mt-1 text-[10px] text-slate-400">Expires {new Date(invite.expires_at).toLocaleString()}</p></div>{!invite.accepted_at && !invite.revoked_at && !invite.declined_at && <button className="text-xs font-semibold text-red-500" onClick={() => organization && void revokeOrganizationInvite(organization.id, invite.id).then(() => setInvites((items) => items.map((item) => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item))).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : 'Could not revoke invitation'))}>Revoke</button>}</div>)}</div></section>}

        {currentMembership && !isOwner && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">Membership</h2>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Leave organization</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Remove your membership and access to this organization’s shared board.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setLeaveDialogOpen(true)}
              >
                Leave organization
              </Button>
            </div>
          </section>
        )}

        {isOwner && (
          <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Delete organization</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Permanently remove this organization, its memberships, and invitations.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete organization
              </Button>
            </div>
          </section>
        )}
      </div>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingOrganization) return;
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmation('');
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
              onChange={(event) => setDeleteConfirmation(event.target.value)}
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
                void removeOrganization();
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
          if (!isLeavingOrganization) setLeaveDialogOpen(open);
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
                void leaveCurrentOrganization();
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

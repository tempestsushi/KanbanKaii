import { CreateOrganizationPanel } from '@/components/organization/CreateOrganizationPanel';
import { InviteMembersPanel, PendingInvitationsPanel } from '@/components/organization/OrganizationInvitationsPanel';
import { OrganizationConfirmDialogs } from '@/components/organization/OrganizationConfirmDialogs';
import { OrganizationDangerZone, OrganizationMembershipPanel } from '@/components/organization/OrganizationDangerPanels';
import { OrganizationMembersPanel } from '@/components/organization/OrganizationMembersPanel';
import { OrganizationSlackWorkspacePanel } from '@/components/organization/OrganizationSlackWorkspacePanel';
import { ProjectBoardsPanel } from '@/components/organization/ProjectBoardsPanel';
import { roleLabel } from '@/components/organization/organization-ui';
import { useOrganizationPageController } from '@/hooks/organization/useOrganizationPageController';

export function OrganizationPage() {
  const page = useOrganizationPageController();

  if (page.isLoading) return <div className="p-8 text-sm text-slate-500">Loading organization…</div>;

  if (!page.organization) {
    return (
      <CreateOrganizationPanel
        name={page.name}
        slug={page.slug}
        isSaving={page.isSaving}
        error={page.error}
        invitations={page.myInvitations}
        respondingInviteId={page.respondingInviteId}
        onNameChange={page.changeOrganizationName}
        onSlugChange={page.changeOrganizationSlug}
        onSubmit={page.submitOrganization}
        onRespondToInvitation={page.respondToInvitation}
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
        <OrganizationHeader
          name={page.organization.name}
          role={page.currentMembership ? roleLabel(page.currentMembership.role) : 'Member'}
        />

        {page.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {page.error}
          </p>
        )}

        <PendingInvitationsPanel
          invitations={page.myInvitations}
          respondingInviteId={page.respondingInviteId}
          onRespond={page.respondToInvitation}
        />

        <OrganizationSlackWorkspacePanel
          slackBinding={page.slackBinding}
          isOwner={page.isOwner}
          isConnectingSlack={page.isConnectingSlack}
          isRefreshingSlackChannels={page.isRefreshingSlackChannels}
          onConnectSlack={page.connectOrganizationSlack}
          onRefreshSlackChannels={page.refreshSlackChannels}
        />

        <ProjectBoardsPanel
          boards={page.boards}
          selectedBoard={page.selectedBoard}
          selectedBoardId={page.selectedBoardId}
          boardMembers={page.boardMembers}
          boardSlackChannels={page.boardSlackChannels}
          availableBoardMembers={page.availableBoardMembers}
          canCreateBoards={page.canCreateBoards}
          canManageSelectedBoard={page.canManageSelectedBoard}
          currentUserId={page.user?.id}
          isSaving={page.isSaving}
          boardName={page.boardName}
          boardSlug={page.boardSlug}
          boardMemberUserId={page.boardMemberUserId}
          boardMemberRole={page.boardMemberRole}
          slackBinding={page.slackBinding}
          slackChannelRefresh={page.slackChannelRefresh ?? page.latestSlackChannelRefresh}
          slackChannelId={page.slackChannelId}
          slackChannelName={page.slackChannelName}
          showSlackChannelForm={page.showSlackChannelForm}
          confirmBoardDelete={page.confirmBoardDelete}
          confirmBoardMemberRemove={page.confirmBoardMemberRemove}
          confirmSlackChannelRemove={page.confirmSlackChannelRemove}
          onSelectBoard={page.selectBoard}
          onBoardNameChange={page.changeBoardName}
          onBoardSlugChange={page.changeBoardSlug}
          onCreateBoard={page.createBoard}
          onBoardMemberUserIdChange={page.setBoardMemberUserId}
          onBoardMemberRoleChange={page.setBoardMemberRole}
          onAddBoardMember={page.addBoardMember}
          onChangeBoardRole={page.changeBoardRole}
          onRemoveBoardMember={page.removeBoardMember}
          onConfirmBoardDeleteChange={page.setConfirmBoardDelete}
          onRemoveBoard={page.removeBoard}
          onConfirmBoardMemberRemoveChange={page.setConfirmBoardMemberRemove}
          onShowSlackChannelFormChange={page.setShowSlackChannelForm}
          onSlackChannelIdChange={page.setSlackChannelId}
          onSlackChannelNameChange={page.setSlackChannelName}
          onAddSlackChannelMapping={page.addSlackChannelMapping}
          onConfirmSlackChannelRemoveChange={page.setConfirmSlackChannelRemove}
          onRemoveSlackChannelMapping={page.removeSlackChannelMapping}
        />

        <OrganizationMembersPanel
          members={page.members}
          currentUserId={page.user?.id}
          isOwner={page.isOwner}
          currentRole={page.currentMembership?.role}
          confirmRemove={page.confirmRemove}
          onRoleChange={page.changeRole}
          onConfirmRemoveChange={page.setConfirmRemove}
          onRemoveMember={page.removeMember}
        />

        {page.canLead && (
          <InviteMembersPanel
            canInviteTeamLeads={page.isOwner}
            inviteEmail={page.inviteEmail}
            inviteRole={page.inviteRole}
            invites={page.invites}
            isSaving={page.isSaving}
            onEmailChange={page.setInviteEmail}
            onRoleChange={page.setInviteRole}
            onSubmit={page.createInvite}
            onRevoke={(invite) => void page.revokeInvite(invite)}
          />
        )}

        <OrganizationMembershipPanel
          isOwner={page.isOwner}
          hasMembership={Boolean(page.currentMembership)}
          onOpenLeaveDialog={() => page.setLeaveDialogOpen(true)}
        />

        <OrganizationDangerZone
          isOwner={page.isOwner}
          onOpenDeleteDialog={() => page.setDeleteDialogOpen(true)}
        />
      </div>

      <OrganizationConfirmDialogs
        organization={page.organization}
        deleteDialogOpen={page.deleteDialogOpen}
        deleteConfirmation={page.deleteConfirmation}
        isDeletingOrganization={page.isDeletingOrganization}
        leaveDialogOpen={page.leaveDialogOpen}
        isLeavingOrganization={page.isLeavingOrganization}
        onDeleteDialogOpenChange={page.setDeleteDialogOpen}
        onDeleteConfirmationChange={page.setDeleteConfirmation}
        onDeleteOrganization={() => void page.removeOrganization()}
        onLeaveDialogOpenChange={page.setLeaveDialogOpen}
        onLeaveOrganization={() => void page.leaveCurrentOrganization()}
      />
    </>
  );
}

function OrganizationHeader({ name, role }: { name: string; role: string }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{role}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{name}</h1>
      <p className="mt-1 text-sm text-slate-500">Manage membership and invitation access for this workspace.</p>
    </section>
  );
}

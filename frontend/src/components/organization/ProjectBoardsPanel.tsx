import type { FormEvent } from 'react';
import type {
  OrganizationBoard,
  OrganizationBoardMember,
  OrganizationBoardRole,
  OrganizationBoardSlackChannel,
  OrganizationMember,
} from '@/api/organizations';
import type { OrganizationSlackBindingStatus } from '@/integrations/slack/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDropdown } from '@/components/ui/app-dropdown';
import { organizationBoardRoles, roleLabel } from './organization-ui';

interface ProjectBoardsPanelProps {
  boards: OrganizationBoard[];
  selectedBoard: OrganizationBoard | null;
  selectedBoardId: string | null;
  boardMembers: OrganizationBoardMember[];
  boardSlackChannels: OrganizationBoardSlackChannel[];
  availableBoardMembers: OrganizationMember[];
  canCreateBoards: boolean;
  canManageSelectedBoard: boolean;
  currentUserId?: string;
  isSaving: boolean;
  boardName: string;
  boardSlug: string;
  boardMemberUserId: string;
  boardMemberRole: OrganizationBoardRole;
  slackBinding: OrganizationSlackBindingStatus;
  slackChannelId: string;
  slackChannelName: string;
  showSlackChannelForm: boolean;
  confirmBoardDelete: string | null;
  confirmBoardMemberRemove: string | null;
  confirmSlackChannelRemove: string | null;
  onSelectBoard: (boardId: string) => void;
  onBoardNameChange: (value: string) => void;
  onBoardSlugChange: (value: string) => void;
  onCreateBoard: (event: FormEvent) => void;
  onBoardMemberUserIdChange: (value: string) => void;
  onBoardMemberRoleChange: (role: OrganizationBoardRole) => void;
  onAddBoardMember: (event: FormEvent) => void;
  onChangeBoardRole: (member: OrganizationBoardMember, role: OrganizationBoardRole) => void;
  onRemoveBoardMember: (userId: string) => void;
  onConfirmBoardDeleteChange: (boardId: string | null) => void;
  onRemoveBoard: (boardId: string) => void;
  onConfirmBoardMemberRemoveChange: (userId: string | null) => void;
  onShowSlackChannelFormChange: (visible: boolean | ((visible: boolean) => boolean)) => void;
  onSlackChannelIdChange: (value: string) => void;
  onSlackChannelNameChange: (value: string) => void;
  onAddSlackChannelMapping: (event: FormEvent) => void;
  onConfirmSlackChannelRemoveChange: (key: string | null) => void;
  onRemoveSlackChannelMapping: (channel: OrganizationBoardSlackChannel) => void;
}

export function ProjectBoardsPanel({
  boards,
  selectedBoard,
  selectedBoardId,
  boardMembers,
  boardSlackChannels,
  availableBoardMembers,
  canCreateBoards,
  canManageSelectedBoard,
  currentUserId,
  isSaving,
  boardName,
  boardSlug,
  boardMemberUserId,
  boardMemberRole,
  slackBinding,
  slackChannelId,
  slackChannelName,
  showSlackChannelForm,
  confirmBoardDelete,
  confirmBoardMemberRemove,
  confirmSlackChannelRemove,
  onSelectBoard,
  onBoardNameChange,
  onBoardSlugChange,
  onCreateBoard,
  onBoardMemberUserIdChange,
  onBoardMemberRoleChange,
  onAddBoardMember,
  onChangeBoardRole,
  onRemoveBoardMember,
  onConfirmBoardDeleteChange,
  onRemoveBoard,
  onConfirmBoardMemberRemoveChange,
  onShowSlackChannelFormChange,
  onSlackChannelIdChange,
  onSlackChannelNameChange,
  onAddSlackChannelMapping,
  onConfirmSlackChannelRemoveChange,
  onRemoveSlackChannelMapping,
}: ProjectBoardsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Project boards</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Split organization work into focused boards. A manager can keep a leadership board private to only the team leads who belong to it.
          </p>
        </div>
        {canCreateBoards && (
          <form onSubmit={onCreateBoard} className="grid gap-2 sm:min-w-[420px] sm:grid-cols-[1fr_1fr_auto]">
            <Input value={boardName} onChange={(event) => onBoardNameChange(event.target.value)} placeholder="Frontend Revamp" required />
            <Input value={boardSlug} onChange={(event) => onBoardSlugChange(event.target.value)} placeholder="frontend-revamp" required minLength={2} />
            <Button disabled={isSaving || boardName.trim().length < 2 || boardSlug.length < 2}>
              {isSaving ? 'Saving…' : 'Create board'}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
          {boards.length === 0 ? (
            <p className="p-3 text-xs leading-5 text-slate-500">No project boards yet. Create one for a project, leadership channel, or client workstream.</p>
          ) : (
            <div className="space-y-1">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => onSelectBoard(board.id)}
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
                      <button className="text-xs font-semibold text-red-600" onClick={() => onRemoveBoard(selectedBoard.id)}>Confirm delete</button>
                      <button className="text-xs text-slate-500" onClick={() => onConfirmBoardDeleteChange(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => onConfirmBoardDeleteChange(selectedBoard.id)}>Delete board</button>
                  )
                )}
              </div>

              {canManageSelectedBoard && (
                <form onSubmit={onAddBoardMember} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <AppDropdown
                    ariaLabel="Board member to add"
                    value={boardMemberUserId}
                    placeholder="Add organization member"
                    onChange={onBoardMemberUserIdChange}
                    options={availableBoardMembers.map((member) => ({
                      value: member.user_id,
                      label: `${member.display_name} · ${roleLabel(member.role)}`,
                    }))}
                  />
                  <AppDropdown
                    ariaLabel="Board member role"
                    value={boardMemberRole}
                    onChange={onBoardMemberRoleChange}
                    options={organizationBoardRoles.map((role) => ({ value: role, label: roleLabel(role) }))}
                  />
                  <Button disabled={isSaving || !boardMemberUserId}>Add member</Button>
                </form>
              )}

              <BoardSlackChannels
                channels={boardSlackChannels}
                canManage={canManageSelectedBoard}
                slackBinding={slackBinding}
                slackChannelId={slackChannelId}
                slackChannelName={slackChannelName}
                showForm={showSlackChannelForm}
                isSaving={isSaving}
                confirmRemoveKey={confirmSlackChannelRemove}
                onShowFormChange={onShowSlackChannelFormChange}
                onChannelIdChange={onSlackChannelIdChange}
                onChannelNameChange={onSlackChannelNameChange}
                onSubmit={onAddSlackChannelMapping}
                onConfirmRemoveChange={onConfirmSlackChannelRemoveChange}
                onRemove={onRemoveSlackChannelMapping}
              />

              <div className="divide-y divide-slate-100">
                {boardMembers.map((member) => {
                  const canManageBoardMember = canManageSelectedBoard && member.user_id !== currentUserId;
                  return (
                    <div key={member.user_id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <MemberIdentity member={member} currentUserId={currentUserId} fallback="Board member" />
                      <div className="flex items-center gap-2">
                        {canManageBoardMember ? (
                          <AppDropdown
                            ariaLabel={`Board role for ${member.display_name}`}
                            className="w-32"
                            value={member.role}
                            onChange={(role) => onChangeBoardRole(member, role)}
                            options={organizationBoardRoles.map((role) => ({ value: role, label: roleLabel(role) }))}
                          />
                        ) : (
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{roleLabel(member.role)}</span>
                        )}
                        {canManageBoardMember && (
                          confirmBoardMemberRemove === member.user_id ? (
                            <>
                              <button className="text-xs font-semibold text-red-600" onClick={() => onRemoveBoardMember(member.user_id)}>Confirm</button>
                              <button className="text-xs text-slate-500" onClick={() => onConfirmBoardMemberRemoveChange(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => onConfirmBoardMemberRemoveChange(member.user_id)}>Remove</button>
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
  );
}

function BoardSlackChannels({
  channels,
  canManage,
  slackBinding,
  slackChannelId,
  slackChannelName,
  showForm,
  isSaving,
  confirmRemoveKey,
  onShowFormChange,
  onChannelIdChange,
  onChannelNameChange,
  onSubmit,
  onConfirmRemoveChange,
  onRemove,
}: {
  channels: OrganizationBoardSlackChannel[];
  canManage: boolean;
  slackBinding: OrganizationSlackBindingStatus;
  slackChannelId: string;
  slackChannelName: string;
  showForm: boolean;
  isSaving: boolean;
  confirmRemoveKey: string | null;
  onShowFormChange: (visible: boolean | ((visible: boolean) => boolean)) => void;
  onChannelIdChange: (value: string) => void;
  onChannelNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onConfirmRemoveChange: (key: string | null) => void;
  onRemove: (channel: OrganizationBoardSlackChannel) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-700">Slack channels connected to this board</h4>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            When a manager or board lead assigns work from a connected Slack channel, KanbanKaii saves the ticket inside this project board.
          </p>
        </div>
        {canManage && (
          <Button type="button" variant="outline" size="sm" disabled={!slackBinding.connected || !slackBinding.slack_team_id} onClick={() => onShowFormChange((visible) => !visible)}>
            {showForm ? 'Cancel' : 'Connect Slack channel'}
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

      {showForm && canManage && slackBinding.connected && slackBinding.slack_team_id && (
        <form onSubmit={onSubmit} className="mt-4 rounded-lg border border-violet-100 bg-white p-3">
          <p className="mb-3 text-[11px] leading-5 text-slate-500">
            Paste the Slack channel ID for the public/private channel you want mapped to this board.
            In Slack, open the channel details and copy the channel ID, usually starting with <span className="font-semibold text-slate-700">C</span> or <span className="font-semibold text-slate-700">G</span>.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={slackChannelId} onChange={(event) => onChannelIdChange(event.target.value)} placeholder="Channel ID, e.g. C0123ABC" required />
            <Input value={slackChannelName} onChange={(event) => onChannelNameChange(event.target.value)} placeholder="Optional display name" />
            <Button disabled={isSaving || !slackChannelId.trim()}>Save channel</Button>
          </div>
        </form>
      )}

      {!slackBinding.connected && (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-[11px] text-slate-500">
          Connect the organization Slack workspace above before linking channels to project boards.
        </p>
      )}

      <div className="mt-3 divide-y divide-slate-200/80">
        {channels.map((channel) => {
          const key = `${channel.slack_team_id}:${channel.slack_channel_id}`;
          return (
            <div key={key} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-slate-700">{channel.slack_channel_name || channel.slack_channel_id}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{channel.slack_team_id} · {channel.slack_channel_id}</p>
              </div>
              {canManage && (
                confirmRemoveKey === key ? (
                  <div className="flex gap-2">
                    <button className="text-xs font-semibold text-red-600" onClick={() => onRemove(channel)}>Confirm</button>
                    <button className="text-xs text-slate-500" onClick={() => onConfirmRemoveChange(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => onConfirmRemoveChange(key)}>Unlink</button>
                )
              )}
            </div>
          );
        })}
        {channels.length === 0 && <p className="py-3 text-center text-[11px] text-slate-500">No Slack channels linked to this board yet.</p>}
      </div>
    </div>
  );
}

function MemberIdentity({
  member,
  currentUserId,
  fallback,
}: {
  member: OrganizationBoardMember;
  currentUserId?: string;
  fallback: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {member.avatar_url ? (
        <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
          {member.display_name.trim().slice(0, 1).toUpperCase()}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-slate-700">{member.display_name}{member.user_id === currentUserId ? ' (You)' : ''}</p>
        <p className="mt-1 text-xs text-slate-400">{member.job_title ?? fallback}</p>
      </div>
    </div>
  );
}

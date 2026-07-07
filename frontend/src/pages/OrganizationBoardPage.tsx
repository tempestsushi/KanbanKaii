import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listOrganizationBoards,
  listOrganizationMembers,
  listOrganizations,
  type Organization,
  type OrganizationBoard,
  type OrganizationMember,
  type OrganizationRole,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export function OrganizationBoardPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [boards, setBoards] = useState<OrganizationBoard[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('OVERVIEW');
  const [role, setRole] = useState<OrganizationRole | undefined>();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const organizations = await listOrganizations();
      const active = organizations[0] ?? null;
      setOrganization(active);
      if (!active) {
        setRole(undefined);
        setMembers([]);
        setBoards([]);
        setSelectedViewId('OVERVIEW');
        return;
      }
      const [loadedMembers, loadedBoards] = await Promise.all([
        listOrganizationMembers(active.id),
        listOrganizationBoards(active.id),
      ]);
      setMembers(loadedMembers);
      setBoards(loadedBoards);
      const loadedRole = loadedMembers.find((member) => member.user_id === user?.id)?.role;
      setRole(loadedRole);
      setSelectedViewId((current) => {
        const validIds = new Set([
          ...(loadedRole === 'OWNER' ? ['OVERVIEW'] : []),
          ...(loadedRole === 'TEAM_LEAD' ? ['ORG_WIDE'] : []),
          ...loadedBoards.map((board) => board.id),
        ]);
        if (validIds.has(current)) return current;
        if (loadedRole === 'OWNER') return 'OVERVIEW';
        if (loadedRole === 'TEAM_LEAD') return 'ORG_WIDE';
        return loadedBoards[0]?.id ?? 'NONE';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

  const boardNames = useMemo(
    () => Object.fromEntries(boards.map((board) => [board.id, board.name])),
    [boards],
  );
  const viewOptions = useMemo(() => [
    ...(role === 'OWNER'
      ? [{ id: 'OVERVIEW', label: 'Organization-wide', helper: 'Manager overview across all project boards.' }]
      : []),
    ...(role === 'TEAM_LEAD'
      ? [{ id: 'ORG_WIDE', label: 'Organization-wide', helper: 'Shared organization tasks outside project boards.' }]
      : []),
    ...boards.map((board) => ({
      id: board.id,
      label: board.name,
      helper: 'Project board tasks visible to board members.',
    })),
  ], [boards, role]);
  const selectedView = viewOptions.find((option) => option.id === selectedViewId);
  const selectedBoardId = boards.some((board) => board.id === selectedViewId) ? selectedViewId : undefined;
  const ticketView = selectedViewId === 'ORG_WIDE' ? 'organization_wide' : 'overview';

  if (isLoading) {
    return <AppLayout pageTitle="Organization board"><div className="p-8 text-sm text-slate-500">Loading organization board…</div></AppLayout>;
  }

  if (error) {
    return <AppLayout pageTitle="Organization board"><div className="p-8"><p className="text-sm text-red-600">{error}</p><Button className="mt-4" variant="outline" onClick={() => void loadOrganization()}>Retry</Button></div></AppLayout>;
  }

  if (!organization || !role) {
    return (
      <AppLayout pageTitle="Organization board">
        <div className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">No organization workspace yet</h1>
          <p className="mt-2 text-sm text-slate-500">Create or join an organization before opening its shared board.</p>
          <a href="/organization" className="mt-5 inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Open organization settings</a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={`${organization.name} board`}>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-violet-50 px-4 py-3 text-xs text-violet-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <span className="font-semibold">{organization.name}</span>
          <span className="ml-2 text-violet-500">
            {role === 'OWNER' || role === 'TEAM_LEAD'
              ? 'You can manage organization tickets.'
              : 'You can view shared tickets and move only tasks assigned to you.'}
          </span>
        </div>
        {viewOptions.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] font-medium text-violet-700">
            Board view
            <select
              value={selectedViewId}
              onChange={(event) => setSelectedViewId(event.target.value)}
              className="rounded-md border border-violet-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-sm outline-none focus:border-violet-400"
            >
              {viewOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {viewOptions.length === 0 ? (
        <div className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">No project boards available</h1>
          <p className="mt-2 text-sm text-slate-500">Ask your manager or team lead to add you to a project board before organization tasks appear here.</p>
        </div>
      ) : (
        <>
          {selectedView?.helper && (
            <div className="border-b border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 sm:px-6">
              {selectedView.helper}
            </div>
          )}
          <KanbanBoard
            organizationId={organization.id}
            organizationBoardId={selectedBoardId}
            organizationTicketView={ticketView}
            organizationBoardNames={boardNames}
            organizationRole={role}
            organizationMembers={members}
          />
        </>
      )}
    </AppLayout>
  );
}

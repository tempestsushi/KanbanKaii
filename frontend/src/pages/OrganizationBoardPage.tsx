import { useCallback, useEffect, useState } from 'react';
import {
  listOrganizationMembers,
  listOrganizations,
  type Organization,
  type OrganizationRole,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

export function OrganizationBoardPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrganizationRole | undefined>();
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
        return;
      }
      const members = await listOrganizationMembers(active.id);
      setRole(members.find((member) => member.user_id === user?.id)?.role);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

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
      <div className="border-b border-slate-200 bg-violet-50 px-4 py-2 text-xs text-violet-700 sm:px-6">
        <span className="font-semibold">{organization.name}</span>
        <span className="ml-2 text-violet-500">
          {role === 'OWNER' || role === 'TEAM_LEAD'
            ? 'You can manage organization tickets.'
            : 'You can view all tickets and move only tasks assigned to you.'}
        </span>
      </div>
      <KanbanBoard organizationId={organization.id} organizationRole={role} />
    </AppLayout>
  );
}

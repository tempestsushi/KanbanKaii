import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  changeOrganizationMemberRole,
  createOrganization,
  createOrganizationInvite,
  deleteOrganization,
  listOrganizationInvites,
  listOrganizationMembers,
  listOrganizations,
  removeOrganizationMember,
  revokeOrganizationInvite,
  type AssignableRole,
  type Organization,
  type OrganizationInvite,
  type OrganizationMember,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
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

const roles: AssignableRole[] = ['TEAM_LEAD', 'MEMBER', 'VIEWER'];
const roleLabel = (role: string) => role.replace('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);

export function OrganizationPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('MEMBER');
  const [createdLink, setCreatedLink] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);

  const currentMembership = useMemo(
    () => members.find((member) => member.user_id === user?.id),
    [members, user?.id],
  );
  const canLead = currentMembership?.role === 'OWNER' || currentMembership?.role === 'TEAM_LEAD';
  const isOwner = currentMembership?.role === 'OWNER';

  const loadOrganization = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const organizations = await listOrganizations();
      const active = organizations[0] ?? null;
      setOrganization(active);
      if (!active) {
        setMembers([]);
        setInvites([]);
        return;
      }
      const loadedMembers = await listOrganizationMembers(active.id);
      setMembers(loadedMembers);
      const role = loadedMembers.find((member) => member.user_id === user?.id)?.role;
      setInvites(role === 'OWNER' || role === 'TEAM_LEAD' ? await listOrganizationInvites(active.id) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

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
      const link = `${window.location.origin}/join/${invite.token}`;
      setCreatedLink(link);
      setInviteEmail('');
      setInvites(await listOrganizationInvites(organization.id));
      toast.success('Invitation created');
    } catch (inviteError) {
      toast.error(inviteError instanceof Error ? inviteError.message : 'Could not create invitation');
    } finally {
      setIsSaving(false);
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

  if (isLoading) return <AppLayout pageTitle="Organization"><div className="p-8 text-sm text-slate-500">Loading organization…</div></AppLayout>;

  if (!organization) {
    return (
      <AppLayout pageTitle="Organization">
        <div className="mx-auto max-w-xl p-5 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Create your organization</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Create the workspace that will contain formal assignments, members and roles.</p>
          <form onSubmit={submitOrganization} className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2"><Label htmlFor="organization-name">Name</Label><Input id="organization-name" value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!slugEdited) setSlug(slugify(value)); }} placeholder="Acme Engineering" required /></div>
            <div className="space-y-2"><Label htmlFor="organization-slug">Organization URL name</Label><Input id="organization-slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} placeholder="acme-engineering" required minLength={2} /></div>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button disabled={isSaving || name.trim().length < 2 || slug.length < 2}>{isSaving ? 'Creating…' : 'Create organization'}</Button>
          </form>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Organization">
      <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
        <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{currentMembership ? roleLabel(currentMembership.role) : 'Member'}</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">{organization.name}</h1><p className="mt-1 text-sm text-slate-500">Manage membership and invitation access for this workspace.</p></section>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Members <span className="text-slate-400">{members.length}</span></h2>
          <div className="mt-4 divide-y divide-slate-100">
            {members.map((member) => {
              const manageable = member.role !== 'OWNER' && member.user_id !== user?.id && (isOwner || (currentMembership?.role === 'TEAM_LEAD' && ['MEMBER', 'VIEWER'].includes(member.role)));
              return <div key={member.user_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-700">{member.user_id === user?.id ? 'You' : `Member ${member.user_id.slice(0, 8)}`}</p><p className="mt-1 text-xs text-slate-400">Joined {new Date(member.joined_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2">{manageable ? <select value={member.role} onChange={(event) => void changeRole(member, event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">{roles.filter((role) => isOwner || role !== 'TEAM_LEAD').map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select> : <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{roleLabel(member.role)}</span>}{manageable && (confirmRemove === member.user_id ? <><button className="text-xs font-semibold text-red-600" onClick={() => void removeMember(member.user_id)}>Confirm</button><button className="text-xs text-slate-500" onClick={() => setConfirmRemove(null)}>Cancel</button></> : <button className="text-xs font-semibold text-slate-400 hover:text-red-600" onClick={() => setConfirmRemove(member.user_id)}>Remove</button>)}</div></div>;
            })}
          </div>
        </section>

        {canLead && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-slate-800">Invite members</h2><form onSubmit={createInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]"><Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Optional email restriction" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AssignableRole)} className="rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">{roles.filter((role) => isOwner || role !== 'TEAM_LEAD').map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><Button disabled={isSaving}>{isSaving ? 'Creating…' : 'Create link'}</Button></form>{createdLink && <div className="mt-4 rounded-lg bg-violet-50 p-3"><p className="break-all text-xs text-violet-800">{createdLink}</p><button className="mt-2 text-xs font-semibold text-violet-700" onClick={() => void navigator.clipboard.writeText(createdLink).then(() => toast.success('Invitation link copied'))}>Copy invitation link</button></div>}<div className="mt-5 divide-y divide-slate-100">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-xs font-medium text-slate-700">{invite.intended_email ?? 'Anyone with the link'} · {roleLabel(invite.default_role)}</p><p className="mt-1 text-[10px] text-slate-400">Expires {new Date(invite.expires_at).toLocaleString()}</p></div>{!invite.accepted_at && !invite.revoked_at && <button className="text-xs font-semibold text-red-500" onClick={() => organization && void revokeOrganizationInvite(organization.id, invite.id).then(() => setInvites((items) => items.map((item) => item.id === invite.id ? { ...item, revoked_at: new Date().toISOString() } : item))).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : 'Could not revoke invitation'))}>Revoke</button>}</div>)}</div></section>}

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
    </AppLayout>
  );
}

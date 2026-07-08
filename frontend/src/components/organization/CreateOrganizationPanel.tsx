import type { FormEvent } from 'react';
import type { MyOrganizationInvitation } from '@/api/organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PendingInvitationsPanel } from './OrganizationInvitationsPanel';

interface CreateOrganizationPanelProps {
  name: string;
  slug: string;
  isSaving: boolean;
  error: string | null;
  invitations: MyOrganizationInvitation[];
  respondingInviteId: string | null;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onRespondToInvitation: (inviteId: string, accept: boolean) => void;
}

export function CreateOrganizationPanel({
  name,
  slug,
  isSaving,
  error,
  invitations,
  respondingInviteId,
  onNameChange,
  onSlugChange,
  onSubmit,
  onRespondToInvitation,
}: CreateOrganizationPanelProps) {
  return (
    <div className="mx-auto max-w-xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create your organization</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create the workspace that will contain formal assignments, members and roles.
        </p>
        <form onSubmit={onSubmit} className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="organization-name">Name</Label>
            <Input
              id="organization-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Acme Engineering"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-slug">Organization URL name</Label>
            <Input
              id="organization-slug"
              value={slug}
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder="acme-engineering"
              required
              minLength={2}
            />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button disabled={isSaving || name.trim().length < 2 || slug.length < 2}>
            {isSaving ? 'Creating…' : 'Create organization'}
          </Button>
        </form>
      </div>
      <PendingInvitationsPanel
        invitations={invitations}
        respondingInviteId={respondingInviteId}
        onRespond={onRespondToInvitation}
      />
    </div>
  );
}

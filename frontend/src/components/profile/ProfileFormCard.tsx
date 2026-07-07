import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useProfilePage } from '@/hooks/profile/useProfilePage';

type ProfileFormCardProps = ReturnType<typeof useProfilePage>;

export function ProfileFormCard({
  initials,
  isSaving,
  jobTitle,
  name,
  save,
  setJobTitle,
  setName,
  user,
}: ProfileFormCardProps) {
  return (
    <section className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">
            {name || user?.email?.split('@')[0] || 'Your account'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {jobTitle || 'Private workspace owner'}
          </p>
        </div>
      </div>

      <form className="space-y-5 p-6" onSubmit={save}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Job title</Label>
            <Input
              id="profile-role"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Product Engineer"
              maxLength={100}
              disabled={isSaving}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" type="email" value={user?.email ?? ''} disabled />
          <p className="text-[11px] text-slate-400">Email changes require a separate verification flow.</p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </section>
  );
}

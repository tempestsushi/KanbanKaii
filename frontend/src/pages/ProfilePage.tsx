import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { updateProfile } from '@/api/profile';
import { useAuth } from '@/auth/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function initialsFor(name: string, email?: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? 'ME';
}

export function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName((user?.user_metadata.display_name as string | undefined) ?? '');
    setJobTitle((user?.user_metadata.job_title as string | undefined) ?? '');
  }, [user]);

  const initials = useMemo(
    () => initialsFor(name, user?.email),
    [name, user?.email],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await updateProfile(user, {
        displayName: name.trim(),
        jobTitle: jobTitle.trim(),
      });
      toast.success('Profile saved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save profile',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout pageTitle="Profile">
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage how you appear in this workspace.</p>

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
      </div>
    </AppLayout>
  );
}

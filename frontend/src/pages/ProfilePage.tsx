import { ProfileFormCard } from '@/components/profile/ProfileFormCard';
import { useProfilePage } from '@/hooks/profile/useProfilePage';

export function ProfilePage() {
  const profilePage = useProfilePage();

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">Manage how you appear in this workspace.</p>
      <ProfileFormCard {...profilePage} />
    </div>
  );
}

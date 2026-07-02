import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  notificationSettingsFromUser,
  updateNotificationSettings,
  type NotificationSettings,
} from '@/api/settings';
import { useAuth } from '@/auth/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { SlackIntegrationCard } from '@/integrations/slack/SlackIntegrationCard';

function SettingToggle({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-slate-100 py-5 last:border-0">
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        <span className="mt-1 block text-xs text-slate-400">{description}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-violet-600 disabled:cursor-not-allowed disabled:opacity-50" />
    </label>
  );
}

function IntegrationCard({ name, description, onConnect }: { name: string; description: string; onConnect: () => void }) {
  return (
    <article className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Not connected</span>
          </div>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">{description}</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onConnect}>Connect {name}</Button>
    </article>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    notificationSettingsFromUser(user),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(notificationSettingsFromUser(user));
  }, [user]);

  const changeSetting = (
    key: keyof NotificationSettings,
    checked: boolean,
  ) => {
    setSettings((current) => ({ ...current, [key]: checked }));
  };

  const saveSettings = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await updateNotificationSettings(user, settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save settings',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const explainIntegrationSetup = (provider: 'GitHub') => {
    toast.info(
      `${provider} OAuth needs provider credentials and a backend callback. We can configure that next.`,
    );
  };

  return (
    <AppLayout pageTitle="Settings">
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Workspace settings</h1>
        <p className="mt-1 text-sm text-slate-500">Control notifications and external connections.</p>

        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
          <p className="mt-1 text-xs text-slate-400">These preferences are stored with your Supabase account.</p>
          <div className="mt-2">
            <SettingToggle label="New tickets" description="Notify me when AI creates a ticket." checked={settings.newTickets} disabled={isSaving} onChange={(checked) => changeSetting('newTickets', checked)} />
            <SettingToggle label="Status changes" description="Notify me when a ticket changes column." checked={settings.statusChanges} disabled={isSaving} onChange={(checked) => changeSetting('statusChanges', checked)} />
            <SettingToggle label="Weekly summary" description="Receive a weekly workspace activity summary." checked={settings.weeklySummary} disabled={isSaving} onChange={(checked) => changeSetting('weeklySummary', checked)} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button disabled={isSaving} onClick={() => void saveSettings()}>
              {isSaving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Integrations</h2>
          <p className="mt-1 text-xs text-slate-400">Connect the accounts that will send messages for AI triage.</p>
          <div className="mt-5 space-y-3">
            <SlackIntegrationCard />
            <IntegrationCard name="GitHub" description="Create tickets from tagged issues, comments, and pull requests." onConnect={() => explainIntegrationSetup('GitHub')} />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

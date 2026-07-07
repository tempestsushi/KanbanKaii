import { IntegrationsSettingsPanel } from '@/components/settings/IntegrationsSettingsPanel';
import { NotificationSettingsPanel } from '@/components/settings/NotificationSettingsPanel';
import { useSettingsPage } from '@/hooks/settings/useSettingsPage';

export function SettingsPage() {
  const settingsPage = useSettingsPage();

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Workspace settings</h1>
      <p className="mt-1 text-sm text-slate-500">Control notifications and external connections.</p>

      <NotificationSettingsPanel
        isSaving={settingsPage.isSaving}
        onChange={settingsPage.changeSetting}
        onSave={settingsPage.saveSettings}
        settings={settingsPage.settings}
      />
      <IntegrationsSettingsPanel />
    </div>
  );
}

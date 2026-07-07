import type { NotificationSettings } from '@/api/settings';
import { Button } from '@/components/ui/button';

type NotificationSettingsPanelProps = {
  isSaving: boolean;
  onChange: (key: keyof NotificationSettings, checked: boolean) => void;
  onSave: () => void;
  settings: NotificationSettings;
};

export function NotificationSettingsPanel({
  isSaving,
  onChange,
  onSave,
  settings,
}: NotificationSettingsPanelProps) {
  return (
    <section className="mt-7 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
      <p className="mt-1 text-xs text-slate-400">Choose which in-app updates you want to see. Your choices follow you on every device.</p>
      <div className="mt-2">
        <SettingToggle label="New AI-created tickets" description="Show an alert when Slack creates a new ticket on your board." checked={settings.newTickets} disabled={isSaving} onChange={(checked) => onChange('newTickets', checked)} />
        <SettingToggle label="Status changes" description="Show an alert when a ticket moves to another column from another session." checked={settings.statusChanges} disabled={isSaving} onChange={(checked) => onChange('statusChanges', checked)} />
        <SettingToggle label="Weekly activity summary" description="Receive an email overview of your workspace activity." checked={false} disabled badge="Coming soon" onChange={() => undefined} />
      </div>
      <div className="mt-5 flex justify-end">
        <Button disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </section>
  );
}

function SettingToggle({ label, description, checked, disabled, badge, onChange }: { label: string; description: string; checked: boolean; disabled: boolean; badge?: string; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-slate-100 py-5 last:border-0">
      <span>
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {label}
          {badge && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-600">{badge}</span>}
        </span>
        <span className="mt-1 block text-xs text-slate-400">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

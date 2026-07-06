import { BarChart3, Building2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Organization', href: '/organization', icon: Building2 },
];

export function AppSidebar() {
  const pathname = window.location.pathname;

  return (
    <aside className="flex w-14 shrink-0 flex-col border-r border-slate-200 bg-white sm:w-56">
      <a
        href="/"
        aria-label="KanbanKaii home"
        className="flex h-16 shrink-0 items-center justify-center gap-3 border-b border-slate-100 px-2 sm:justify-start sm:px-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-200">
          K
        </span>
        <span className="hidden truncate text-lg font-bold tracking-tight text-slate-950 sm:block">
          KanbanKaii
        </span>
      </a>
      <nav className="flex flex-1 flex-col items-center gap-2 px-2 py-4 sm:items-stretch sm:px-3" aria-label="Primary navigation">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={label}
              href={href}
              aria-label={label}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center gap-3 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600 sm:w-full sm:justify-start sm:px-3',
                active && 'bg-violet-50 text-violet-600 before:absolute before:-left-2 before:h-6 before:w-0.5 before:rounded-r before:bg-violet-500 sm:before:-left-3',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden text-xs font-semibold sm:block">{label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

import { BarChart3, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = window.location.pathname;

  return (
    <aside className="flex w-14 shrink-0 flex-col border-r border-slate-200 bg-white sm:w-16">
      <div className="flex h-16 items-center justify-center bg-violet-500 text-sm font-bold text-white">
        AI
      </div>
      <nav className="flex flex-1 flex-col items-center gap-2 py-4" aria-label="Primary navigation">
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
                'relative flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600',
                active && 'bg-violet-50 text-violet-600 before:absolute before:-left-2 before:h-6 before:w-0.5 before:rounded-r before:bg-violet-500 sm:before:-left-3',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';

interface AppLayoutProps {
  pageTitle: string;
  children: ReactNode;
}

export function AppLayout({ pageTitle, children }: AppLayoutProps) {
  return (
    <div className="flex h-dvh min-h-[560px] overflow-hidden bg-violet-100">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav pageTitle={pageTitle} />
        <main className="min-h-0 flex-1 overflow-auto bg-slate-50 pb-16 sm:pb-0">{children}</main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

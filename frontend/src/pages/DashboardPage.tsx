import { KanbanBoard } from '@/components/KanbanBoard';
import { AppLayout } from '@/components/layout/AppLayout';

export function DashboardPage() {
  return (
    <AppLayout pageTitle="Kanban dashboard">
      <KanbanBoard />
    </AppLayout>
  );
}

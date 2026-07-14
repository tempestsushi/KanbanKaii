import { useEffect, useMemo, useState } from 'react';
import {
  listOrganizationBoards,
  listOrganizations,
  type OrganizationBoard,
} from '@/api/organizations';
import { KanbanBoard } from '@/components/KanbanBoard';

export function DashboardPage() {
  const [boards, setBoards] = useState<OrganizationBoard[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadBoardNames = async () => {
      try {
        const organizations = await listOrganizations();
        const boardGroups = await Promise.all(
          organizations.map((organization) => listOrganizationBoards(organization.id)),
        );
        if (!cancelled) setBoards(boardGroups.flat());
      } catch {
        if (!cancelled) setBoards([]);
      }
    };

    void loadBoardNames();
    return () => {
      cancelled = true;
    };
  }, []);

  const boardNames = useMemo(
    () => Object.fromEntries(boards.map((board) => [board.id, board.name])),
    [boards],
  );

  return <KanbanBoard organizationBoardNames={boardNames} />;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import {
  listOrganizationBoards,
  listOrganizationMembers,
  listOrganizations,
  type Organization,
  type OrganizationBoard,
  type OrganizationMember,
  type OrganizationRole,
} from '@/api/organizations';
import { useAuth } from '@/auth/AuthContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';

const selectedViewStorageKey = (organizationId: string, userId: string | undefined) =>
  `kanbankaii:organization-board-view:${organizationId}:${userId ?? 'anonymous'}`;

const organizationBoardCacheKey = (userId: string | undefined) =>
  `kanbankaii:organization-board-cache:${userId ?? 'anonymous'}`;

const ORGANIZATION_BOARD_CACHE_TTL_MS = 5 * 60 * 1000;

type OrganizationBoardCache = {
  boards: OrganizationBoard[];
  members: OrganizationMember[];
  organization: Organization;
  role: OrganizationRole;
  savedAt: number;
};

function readOrganizationBoardCache(userId: string | undefined): OrganizationBoardCache | null {
  try {
    const raw = window.sessionStorage.getItem(organizationBoardCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrganizationBoardCache>;
    if (
      !parsed.organization ||
      !Array.isArray(parsed.boards) ||
      !Array.isArray(parsed.members) ||
      !parsed.role ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > ORGANIZATION_BOARD_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed as OrganizationBoardCache;
  } catch {
    return null;
  }
}

function writeOrganizationBoardCache(userId: string | undefined, cache: Omit<OrganizationBoardCache, 'savedAt'>) {
  window.sessionStorage.setItem(
    organizationBoardCacheKey(userId),
    JSON.stringify({ ...cache, savedAt: Date.now() }),
  );
}

function clearOrganizationBoardCache(userId: string | undefined) {
  window.sessionStorage.removeItem(organizationBoardCacheKey(userId));
}

export function OrganizationBoardPage() {
  const { user } = useAuth();
  const cachedBoardContext = useMemo(() => readOrganizationBoardCache(user?.id), [user?.id]);
  const initialSelectedViewId = useMemo(() => {
    if (!cachedBoardContext) return 'ORG_WIDE';
    const stored = window.localStorage.getItem(selectedViewStorageKey(cachedBoardContext.organization.id, user?.id));
    const validIds = new Set(['ORG_WIDE', ...cachedBoardContext.boards.map((board) => board.id)]);
    return stored && validIds.has(stored) ? stored : 'ORG_WIDE';
  }, [cachedBoardContext, user?.id]);
  const [organization, setOrganization] = useState<Organization | null>(cachedBoardContext?.organization ?? null);
  const [boards, setBoards] = useState<OrganizationBoard[]>(cachedBoardContext?.boards ?? []);
  const [selectedViewId, setSelectedViewId] = useState(initialSelectedViewId);
  const [role, setRole] = useState<OrganizationRole | undefined>(cachedBoardContext?.role);
  const [members, setMembers] = useState<OrganizationMember[]>(cachedBoardContext?.members ?? []);
  const [isLoading, setIsLoading] = useState(!cachedBoardContext);
  const [error, setError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);

  const loadOrganization = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!cachedBoardContext) setIsLoading(true);
    setError(null);
    try {
      const organizations = await listOrganizations();
      const active = organizations[0] ?? null;
      setOrganization(active);
      if (!active) {
        setRole(undefined);
        setMembers([]);
        setBoards([]);
        setSelectedViewId('OVERVIEW');
        clearOrganizationBoardCache(user?.id);
        return;
      }
      const [loadedMembers, loadedBoards] = await Promise.all([
        listOrganizationMembers(active.id),
        listOrganizationBoards(active.id),
      ]);
      setMembers(loadedMembers);
      setBoards(loadedBoards);
      const loadedRole = loadedMembers.find((member) => member.user_id === user?.id)?.role;
      setRole(loadedRole);
      if (loadedRole) {
        writeOrganizationBoardCache(user?.id, {
          organization: active,
          boards: loadedBoards,
          members: loadedMembers,
          role: loadedRole,
        });
      }
      setSelectedViewId((current) => {
        const stored = window.localStorage.getItem(selectedViewStorageKey(active.id, user?.id));
        const validIds = new Set([
          'ORG_WIDE',
          ...loadedBoards.map((board) => board.id),
        ]);
        if (stored && validIds.has(stored)) return stored;
        if (validIds.has(current)) return current;
        return 'ORG_WIDE';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load organization');
    } finally {
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [cachedBoardContext, user?.id]);

  useEffect(() => { void loadOrganization(); }, [loadOrganization]);

  const boardNames = useMemo(
    () => Object.fromEntries(boards.map((board) => [board.id, board.name])),
    [boards],
  );
  const viewOptions = useMemo(() => [
    {
      id: 'ORG_WIDE',
      label: 'Organization-wide',
      helper: 'Read-only overview of the project-board tickets you are allowed to see.',
    },
    ...boards.map((board) => ({
      id: board.id,
      label: board.name,
      helper: 'Project board tasks visible to board members.',
    })),
  ], [boards]);
  const selectedBoardId = boards.some((board) => board.id === selectedViewId) ? selectedViewId : undefined;
  const ticketView = 'overview';

  const selectView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (organization) {
      window.localStorage.setItem(selectedViewStorageKey(organization.id, user?.id), viewId);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading organization board…</div>;
  }

  if (error && !organization) {
    return <div className="p-8"><p className="text-sm text-red-600">{error}</p><Button className="mt-4" variant="outline" onClick={() => void loadOrganization()}>Retry</Button></div>;
  }

  if (!organization || !role) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No organization workspace yet</h1>
        <p className="mt-2 text-sm text-slate-500">Create or join an organization before opening its shared board.</p>
        <a href="/organization" className="mt-5 inline-flex rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Open organization settings</a>
      </div>
    );
  }

  return (
    <>
      {viewOptions.length === 0 ? (
        <div className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">No project boards available</h1>
          <p className="mt-2 text-sm text-slate-500">Ask your manager or team lead to add you to a project board before organization tasks appear here.</p>
        </div>
      ) : (
        <KanbanBoard
          organizationId={organization.id}
          organizationBoardId={selectedBoardId}
          organizationTicketView={ticketView}
          organizationBoardNames={boardNames}
          organizationRole={role}
          organizationMembers={members}
          toolbarContext={
            <OrganizationBoardSwitcher
              organizationName={organization.name}
              selectedViewId={selectedViewId}
              viewOptions={viewOptions}
              onSelectView={selectView}
            />
          }
        />
      )}
    </>
  );
}

type OrganizationBoardViewOption = {
  helper: string;
  id: string;
  label: string;
};

function OrganizationBoardSwitcher({
  organizationName,
  selectedViewId,
  viewOptions,
  onSelectView,
}: {
  organizationName: string;
  selectedViewId: string;
  viewOptions: OrganizationBoardViewOption[];
  onSelectView: (viewId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedView = viewOptions.find((option) => option.id === selectedViewId) ?? viewOptions[0];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-xs font-semibold text-violet-600">{organizationName}</p>
        <p className="hidden max-w-sm truncate text-[10px] text-slate-400 lg:block">
          Shared board visibility. Update assigned work from My Tasks.
        </p>
      </div>
      <div ref={menuRef} className="relative flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-500">
        <span className="hidden shrink-0 min-[390px]:inline">View</span>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-8 min-w-0 max-w-[11rem] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-[11px] font-medium text-slate-700 shadow-sm outline-none transition hover:border-violet-200 hover:text-violet-700 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:w-44"
        >
          <span className="truncate">{selectedView?.label ?? 'Select view'}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 top-10 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {viewOptions.map((option) => {
              const selected = option.id === selectedViewId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelectView(option.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium transition ${
                    selected ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

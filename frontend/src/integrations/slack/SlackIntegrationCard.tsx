import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  disconnectSlack,
  getSlackConnectionStatus,
  startSlackConnection,
  type SlackConnectionStatus,
} from './api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SLACK_STATUS_CACHE_KEY = 'kanbankaii:slack-connection-status';
const SLACK_STATUS_CACHE_TTL_MS = 2 * 60 * 1000;

type CachedSlackConnectionStatus = SlackConnectionStatus & {
  savedAt: number;
};

function readSlackStatusCache(): SlackConnectionStatus | null {
  try {
    const raw = window.sessionStorage.getItem(SLACK_STATUS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSlackConnectionStatus>;
    if (
      typeof parsed.connected !== 'boolean' ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > SLACK_STATUS_CACHE_TTL_MS
    ) {
      return null;
    }
    return {
      connected: parsed.connected,
      workspace_name: typeof parsed.workspace_name === 'string' ? parsed.workspace_name : null,
    };
  } catch {
    return null;
  }
}

function writeSlackStatusCache(status: SlackConnectionStatus) {
  window.sessionStorage.setItem(
    SLACK_STATUS_CACHE_KEY,
    JSON.stringify({ ...status, savedAt: Date.now() }),
  );
}

export function SlackIntegrationCard() {
  const [cachedStatus] = useState(readSlackStatusCache);
  const [hasCachedStatus] = useState(Boolean(cachedStatus));
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(!cachedStatus);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [status, setStatus] = useState<SlackConnectionStatus>(cachedStatus ?? {
    connected: false,
    workspace_name: null,
  });

  const loadStatus = useCallback(async (showLoading = !hasCachedStatus) => {
    if (showLoading) setIsLoading(true);
    try {
      const nextStatus = await getSlackConnectionStatus();
      setStatus(nextStatus);
      writeSlackStatusCache(nextStatus);
    } catch (error) {
      if (error instanceof TypeError) return;
      toast.error(
        error instanceof Error ? error.message : 'Could not load Slack status',
      );
    } finally {
      setIsLoading(false);
    }
  }, [hasCachedStatus]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const result = query.get('slack');
    if (result === 'connected') {
      toast.success('Slack workspace connected');
    } else if (result === 'error') {
      toast.error(`Slack connection failed: ${query.get('reason') ?? 'unknown error'}`);
    }
    if (result) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    void loadStatus(!cachedStatus);
  }, [cachedStatus, loadStatus]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // Pressing Back after abandoning Slack OAuth can restore this page from
      // the browser cache with its old `isConnecting` state still intact.
      if (!event.persisted) return;
      setIsConnecting(false);
      void loadStatus(false);
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [loadStatus]);

  const connect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const authorizationUrl = await startSlackConnection();
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not connect Slack',
      );
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      await disconnectSlack();
      const nextStatus = { connected: false, workspace_name: null };
      setStatus(nextStatus);
      writeSlackStatusCache(nextStatus);
      toast.success('Slack disconnected');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not disconnect Slack',
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <article className="flex min-w-0 flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
          <SlackMark />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Slack</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {isLoading ? 'Checking…' : status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="mt-1 max-w-md break-words text-xs leading-5 text-slate-400">
            {status.connected
              ? `Workspace: ${status.workspace_name}`
              : 'Authorize a workspace so tagged messages can enter AI triage.'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
        {status.connected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isDisconnecting || isLoading}>
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Slack?</AlertDialogTitle>
                <AlertDialogDescription>
                  KanbanKaii will stop receiving Slack messages. Your existing tickets will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void disconnect()}>
                  Disconnect Slack
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isConnecting || isLoading} onClick={() => void connect()}>
          {isConnecting ? 'Opening Slack…' : status.connected ? 'Reconnect Slack' : 'Connect Slack'}
        </Button>
      </div>
    </article>
  );
}

function SlackMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 122.8 122.8" className="h-5 w-5">
      <path fill="#36C5F0" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zM32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
      <path fill="#2EB67D" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zM45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
      <path fill="#ECB22E" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zM90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
      <path fill="#E01E5A" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zM77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
    </svg>
  );
}

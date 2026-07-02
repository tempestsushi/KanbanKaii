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

export function SlackIntegrationCard() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [status, setStatus] = useState<SlackConnectionStatus>({
    connected: false,
    workspace_name: null,
  });

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getSlackConnectionStatus());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load Slack status',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    void loadStatus();
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
      setStatus({ connected: false, workspace_name: null });
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
    <article className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">SL</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Slack</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {isLoading ? 'Checking…' : status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
            {status.connected
              ? `Workspace: ${status.workspace_name}`
              : 'Authorize a workspace so tagged messages can enter AI triage.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status.connected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={isDisconnecting || isLoading}>
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
        <Button type="button" variant="outline" disabled={isConnecting || isLoading} onClick={() => void connect()}>
          {isConnecting ? 'Opening Slack…' : status.connected ? 'Reconnect Slack' : 'Connect Slack'}
        </Button>
      </div>
    </article>
  );
}

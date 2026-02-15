import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineSync } from '../utils/offlineSync';
import { notify } from './AnimatedNotification';

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [syncing, setSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);

  React.useEffect(() => {
    loadPendingCount();
  }, []);

  React.useEffect(() => {
    if (isOnline && wasOffline) {
      notify.success('تم الاتصال بالإنترنت');
      handleSync();
    } else if (!isOnline) {
      notify.warning('أنت غير متصل بالإنترنت');
    }
  }, [isOnline, wasOffline]);

  const loadPendingCount = async () => {
    try {
      const pending = await offlineSync.getPendingInvoices();
      setPendingCount(pending.length);
    } catch (err) {}
  };

  const handleSync = async () => {
    if (!isOnline) {
      notify.error('لا يمكن المزامنة بدون اتصال');
      return;
    }

    setSyncing(true);
    try {
      const results = await offlineSync.syncPendingData();
      const successful = results.filter(r => r.success).length;
      
      if (successful > 0) {
        notify.success(`تم مزامنة ${successful} عملية`);
        loadPendingCount();
      }
    } catch (err) {
      notify.error('فشلت المزامنة');
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${
        isOnline 
          ? 'bg-green-500/90 text-white' 
          : 'bg-orange-500/90 text-white'
      }`}>
        {isOnline ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        
        <div className="text-sm font-medium">
          {isOnline ? 'متصل' : 'غير متصل'}
          {pendingCount > 0 && (
            <span className="mr-2">({pendingCount} في الانتظار)</span>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

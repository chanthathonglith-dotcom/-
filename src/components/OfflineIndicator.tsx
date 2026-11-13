import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-amber-600 dark:bg-amber-700 px-3 py-2 text-xs font-semibold text-white shadow-lg border border-amber-500/50"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>ໂໝດອອບໄລນ໌ — ກຳລັງໃຊ້ຂໍ້ມູນທີ່ບັນທຶກໄວ້</span>
    </div>
  );
};

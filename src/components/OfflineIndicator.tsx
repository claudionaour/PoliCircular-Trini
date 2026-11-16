import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#102C49] shadow-lg border border-[#F28C28]"
    >
      <WifiOff className="h-4 w-4 text-[#D97719] shrink-0" />
      <span>
        Sin conexión a internet. Puedes consultar recursos en caché, pero no confirmar entregas ni aprobar publicaciones sin conexión.
      </span>
    </div>
  );
};

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  if (isInstalled || Capacitor.isNativePlatform()) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-[#3B648F] bg-[#0B1E33] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#163B61] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-4 w-4 text-[#FFA94D]" />
        {compact ? 'Instalar' : 'Instalar app'}
      </button>
    );
  }

  if (isAndroid) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowAndroidGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#3B648F] bg-[#0B1E33] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#163B61] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="h-4 w-4 text-[#FFA94D]" />
          {compact ? 'Instalar' : 'Instalar en Android'}
        </button>

        {showAndroidGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-[#102C49] p-6 shadow-xl border border-[#244B73]">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Instalar PoliCircular en Android
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAndroidGuide(false)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg"
                  aria-label="Cerrar guía Android"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-slate-200 list-decimal list-inside">
                <li>
                  Abre PoliCircular en <strong>Google Chrome</strong> en tu teléfono Android.
                </li>
                <li>
                  Toca el menú <strong>⋮</strong> en la esquina superior derecha.
                </li>
                <li>
                  Selecciona <strong>Instalar aplicación</strong> (o <strong>Agregar a la pantalla principal</strong>) y confirma <strong>Instalar</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#F28C28] py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#3B648F] bg-[#0B1E33] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#163B61] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Share className="h-4 w-4 text-[#FFA94D]" />
          {compact ? 'Instalar' : 'Instalar en iOS'}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-[#102C49] p-6 shadow-xl border border-[#244B73]">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Instalar PoliCircular en iPhone o iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg"
                  aria-label="Cerrar guía de instalación"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-slate-200 list-decimal list-inside">
                <li>
                  Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                </li>
                <li>
                  Desliza hacia abajo y selecciona <strong>Agregar a inicio</strong>.
                </li>
                <li>Confirma tocando <strong>Agregar</strong> en la esquina superior derecha.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#F28C28] py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242] transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

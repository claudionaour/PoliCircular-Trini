import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface OsmSectorMapProps {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  interactive?: boolean;
  onSelectPoint?: (lat: number, lng: number) => void;
  heightClass?: string;
}

const CASTRO_DEFAULT: [number, number] = [-42.4822, -73.7644];

export const OsmSectorMap: React.FC<OsmSectorMapProps> = ({
  latitude,
  longitude,
  label = 'Zona referencial aproximada (sin domicilio particular)',
  interactive = false,
  onSelectPoint,
  heightClass = 'h-60',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const centerLat = latitude ?? CASTRO_DEFAULT[0];
  const centerLng = longitude ?? CASTRO_DEFAULT[1];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;

    map.setView([centerLat, centerLng], 13);
    group.clearLayers();

    // Se dibuja un área aproximada (800m) para proteger domicilios particulares
    const circle = L.circle([centerLat, centerLng], {
      color: '#102C49',
      fillColor: '#F28C28',
      fillOpacity: 0.2,
      weight: 2,
      radius: 750,
    }).addTo(group);

    circle.bindPopup(label);

    if (interactive && onSelectPoint) {
      const clickHandler = (e: L.LeafletMouseEvent) => {
        onSelectPoint(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
      };
      map.on('click', clickHandler);
      return () => {
        map.off('click', clickHandler);
      };
    }
  }, [centerLat, centerLng, label, interactive, onSelectPoint]);

  return (
    <div className="rounded-xl overflow-hidden border border-[#244B73] bg-[#0B1E33]">
      <div ref={containerRef} className={`w-full ${heightClass} z-0`} />
      <div className="px-3 py-2 text-xs text-slate-200 bg-[#102C49] border-t border-[#244B73] flex items-center justify-between gap-2">
        <span>{label}</span>
        {interactive && (
          <span className="text-[#FFA94D] font-medium">
            Toca el mapa para sugerir punto de encuentro público
          </span>
        )}
      </div>
    </div>
  );
};

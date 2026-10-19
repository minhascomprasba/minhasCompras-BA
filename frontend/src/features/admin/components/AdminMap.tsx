import { renderToStaticMarkup } from 'react-dom/server';
import { MapPinIcon as MapMarker } from '@phosphor-icons/react';
import './AdminMap.css';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { useEffect, useRef, useState } from 'react';
import type { AlcanceGeografico, AlcancePonto } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Distribuição geográfica das compras por município e principais redes comerciais registradas pelos usuários.';

// Centro aproximado do estado da Bahia (enquadramento inicial).
const BAHIA_CENTER: [number, number] = [-12.5, -41.7];

interface MapMarker {
  openPopup: () => void;
}
interface AdminLeafletMap {
  remove: () => void;
  invalidateSize: () => void;
  removeLayer: (marker: MapMarker) => void;
  setView: (center: [number, number], zoom: number) => void;
  fitBounds: (bounds: unknown, options: { padding: [number, number]; maxZoom: number }) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface AdminMapProps {
  alcance: AlcanceGeografico;
}

const EMPTY_PONTOS: AlcancePonto[] = [];

export function AdminMap({ alcance }: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AdminLeafletMap | null>(null);
  const markersRef = useRef<MapMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const pontos = alcance.pontos ?? EMPTY_PONTOS;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let invalidateTimer: number | undefined;

    const init = () => {
      if (cancelled) return;
      const L = window.L;
      if (!L) {
        attempts += 1;
        if (attempts > 50) {
          setMapError(true);
          return;
        }
        window.setTimeout(init, 100);
        return;
      }
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: BAHIA_CENTER,
        zoom: 7,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Card pode ter layout atrasado; invalida o tamanho após o paint.
      invalidateTimer = window.setTimeout(() => {
        map.invalidateSize();
      }, 80);

      setMapReady(true);
    };

    init();

    return () => {
      cancelled = true;
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!mapReady || !map || !L) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (pontos.length === 0) {
      map.setView(BAHIA_CENTER, 7);
      return;
    }

    const pinSvg = renderToStaticMarkup(<MapMarker width={28} height={36} weight="fill" color="#17c85f" aria-hidden="true" />);
    const pinIcon = L.divIcon({
      html: pinSvg,
      className: 'map-pin',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -34],
    });

    pontos.forEach((ponto: AlcancePonto) => {
      const marker = L.marker([ponto.latitude, ponto.longitude], { icon: pinIcon }).addTo(map);
      marker.bindPopup(
        `<div class="map-popup">
           <strong>${escapeHtml(ponto.nome)}</strong>
           <span>${escapeHtml(ponto.cidade)}${ponto.estado ? ` - ${escapeHtml(ponto.estado)}` : ''}</span>
           <span>${escapeHtml(ponto.endereco || '')}</span>
           <span class="map-popup-count">${ponto.notasCount} nota(s) no período</span>
         </div>`
      );
      markersRef.current.push(marker);
    });

    map.invalidateSize();
    if (pontos.length === 1) {
      map.setView([pontos[0].latitude, pontos[0].longitude], 13);
      markersRef.current[0]?.openPopup();
    } else {
      const bounds = L.latLngBounds(pontos.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
    }
  }, [pontos, mapReady]);

  return (
    <Card className="min-w-0 gap-4 px-4">
      <MetricHead title="Alcance Geográfico e Redes" tooltip={TOOLTIP} />

      <div className="relative z-0 space-y-4">
        {mapError ? (
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-background p-5 text-center text-sm text-destructive">
            Não foi possível carregar o mapa. Verifique a conexão e tente novamente.
          </div>
        ) : (
          <div className="relative isolate min-h-64 overflow-hidden rounded-lg border border-border bg-background">
            <div ref={mapContainerRef} role="region" aria-label="Distribuição geográfica das compras" className="h-70 w-full bg-background" />
            {pontos.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 bg-background/80 p-5 text-center text-sm text-muted-foreground">
                <div>{alcance.nota}</div>
                <p className="m-0 text-sm text-muted-foreground">
                  Sem coordenadas disponíveis para o período
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div>{alcance.nota}</div>
          <p className="m-0 text-sm text-muted-foreground">
            {alcance.totalCidades} municípios &bull; {alcance.redesMonitoradas} redes
            registradas
            {pontos.length > 0 ? ` · ${pontos.length} no mapa` : ''}
          </p>
          {alcance.redesLideres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {alcance.redesLideres.map((rede) => (
                <Badge key={rede} variant="secondary">
                  {rede}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

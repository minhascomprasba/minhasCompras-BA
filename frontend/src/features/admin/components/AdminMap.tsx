import { useEffect, useRef, useState } from 'react';
import type { AlcanceGeografico, AlcancePonto } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Distribuição geográfica das compras por município e principais redes comerciais registradas pelos usuários.';

// Centro aproximado do estado da Bahia (enquadramento inicial).
const BAHIA_CENTER: [number, number] = [-12.5, -41.7];

declare global {
  interface Window {
    L: any;
  }
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
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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

    const pinSvg = `
      <svg width="28" height="36" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#17c85f"/>
        <circle cx="15" cy="15" r="6" fill="#033876"/>
      </svg>`;
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
    <div className="card admin-chart-card">
      <MetricHead title="Alcance Geográfico e Redes" tooltip={TOOLTIP} />

      <div className="admin-map-body">
        {mapError ? (
          <div className="admin-map-empty">
            Não foi possível carregar o mapa. Verifique a conexão e tente novamente.
          </div>
        ) : (
          <div className="admin-map-canvas">
            <div ref={mapContainerRef} className="admin-map-view" />
            {pontos.length === 0 && (
              <div className="admin-map-overlay">
                <p>{alcance.nota}</p>
                <p className="admin-map-placeholder-stats">
                  Sem coordenadas disponíveis para o período
                </p>
              </div>
            )}
          </div>
        )}

        <div className="admin-map-summary">
          <p>{alcance.nota}</p>
          <p className="admin-map-placeholder-stats">
            {alcance.totalCidades} municípios &bull; {alcance.redesMonitoradas} redes
            registradas
            {pontos.length > 0 ? ` · ${pontos.length} no mapa` : ''}
          </p>
          {alcance.redesLideres.length > 0 && (
            <div className="admin-map-redes">
              {alcance.redesLideres.map((rede) => (
                <span key={rede} className="admin-map-redes-chip">
                  {rede}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

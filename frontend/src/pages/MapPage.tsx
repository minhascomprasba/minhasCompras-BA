import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mapaService, type MapaNota, type MapaPonto } from '../features/mapa/mapaService';

// Leaflet é carregado via CDN no index.html e exposto em window.L.
declare global {
  interface Window {
    L: any;
  }
}

interface ResolvedLocation {
  id: string;
  cep: string;
  label: string;
  address: string;
  notasCount: number;
  notas: MapaNota[];
  lat: number;
  lng: number;
}

// Centro aproximado do estado da Bahia (enquadramento inicial).
const BAHIA_CENTER: [number, number] = [-12.5, -41.7];

const cleanCep = (cep: string) => cep.replace(/\D/g, '');
const formatCep = (cep: string) => {
  const c = cleanCep(cep);
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cep;
};

function formatAddressFromPonto(ponto: MapaPonto): string {
  if (ponto.endereco) return ponto.endereco;
  const line1 = [ponto.logradouro, ponto.bairro].filter(Boolean).join(', ');
  const line2 = [ponto.cidade, ponto.estado].filter(Boolean).join(' - ');
  return [line1, line2].filter(Boolean).join(', ');
}

function pontoToLocation(ponto: MapaPonto): ResolvedLocation | null {
  const lat = ponto.latitude;
  const lng = ponto.longitude;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  const cep = (ponto.cep ?? '').trim();
  return {
    id: `est-${ponto.estabelecimento_id}`,
    cep,
    label: ponto.razao_social || 'Estabelecimento',
    address: formatAddressFromPonto(ponto),
    notasCount: ponto.notas_count,
    notas: ponto.notas ?? [],
    lat,
    lng,
  };
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type Status = 'loading' | 'ready' | 'empty' | 'error';

export function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  const {
    data: pontos,
    isLoading: loadingPontos,
    isError: pontosError,
  } = useQuery<MapaPonto[]>({
    queryKey: ['mapa-pontos'],
    queryFn: () => mapaService.getPontos(),
    refetchOnWindowFocus: false,
    // Coordenadas já vêm persistidas do backend; evita refetch desnecessário.
    staleTime: 5 * 60 * 1000,
  });

  const { locations, failedCeps, status } = useMemo(() => {
    if (pontosError) {
      return { locations: [] as ResolvedLocation[], failedCeps: [] as string[], status: 'error' as Status };
    }
    if (!pontos) {
      return { locations: [] as ResolvedLocation[], failedCeps: [] as string[], status: 'loading' as Status };
    }
    if (pontos.length === 0) {
      return { locations: [] as ResolvedLocation[], failedCeps: [] as string[], status: 'empty' as Status };
    }

    const resolved: ResolvedLocation[] = [];
    const failed: string[] = [];
    for (const ponto of pontos) {
      const loc = pontoToLocation(ponto);
      if (loc) resolved.push(loc);
      else if (ponto.cep) failed.push(formatCep(ponto.cep));
    }

    return {
      locations: resolved,
      failedCeps: failed,
      status: (resolved.length > 0 ? 'ready' : 'empty') as Status,
    };
  }, [pontos, pontosError]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (locations.length > 0 && !selectedId) {
      setSelectedId(locations[0].id);
    } else if (locations.length > 0 && !locations.some((l) => l.id === selectedId)) {
      setSelectedId(locations[0].id);
    } else if (locations.length === 0) {
      setSelectedId('');
    }
  }, [locations, selectedId]);

  // Inicializa o mapa Leaflet uma única vez (aguardando o script do CDN).
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

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
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      setMapReady(true);
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        setMapReady(false);
      }
    };
  }, []);

  // (Re)desenha os marcadores quando o mapa está pronto e os locais mudam.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!mapReady || !map || !L) return;

    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};

    if (locations.length === 0) return;

    const pinSvg = `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#17c85f"/>
        <circle cx="15" cy="15" r="6" fill="#033876"/>
      </svg>`;
    const pinIcon = L.divIcon({
      html: pinSvg,
      className: 'map-pin',
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -38],
    });

    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(
        `<div class="map-popup">
           <strong>${loc.label}</strong>
           <span>CEP ${formatCep(loc.cep)}</span>
           <span>${loc.address}</span>
           <span class="map-popup-count">${loc.notasCount} nota(s) deste local</span>
         </div>`
      );
      marker.on('click', () => setSelectedId(loc.id));
      markersRef.current[loc.id] = marker;
    });

    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 14);
      markersRef.current[locations[0].id]?.openPopup();
    } else {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, mapReady]);

  const focusLocation = (loc: ResolvedLocation) => {
    setSelectedId(loc.id);
    const map = mapRef.current;
    const marker = markersRef.current[loc.id];
    if (map && marker) {
      map.flyTo([loc.lat, loc.lng], 15, { duration: 0.8 });
      marker.openPopup();
    }
  };

  const isBusy = status === 'loading' || loadingPontos;
  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="container">
      <div className="mb-6">
        <h1 className="page-title">Mapa das Compras</h1>
        <p className="page-subtitle">
          Localização dos estabelecimentos onde suas notas foram emitidas.
          Clique em um marcador ou em um local da lista para ver os detalhes.
        </p>
      </div>

      <div className="map-layout">
        <aside className="map-sidebar">
          <span className="map-sidebar-title">
            {isBusy ? 'Carregando locais…' : `Locais (${locations.length})`}
          </span>

          {isBusy && (
            <div className="map-location-card map-location-card--placeholder">
              <span className="spinner" style={{ width: 18, height: 18 }} />
              <span className="map-location-info">
                <strong>Carregando mapa…</strong>
                <span>Buscando estabelecimentos com coordenadas</span>
              </span>
            </div>
          )}

          {!isBusy && status === 'error' && (
            <div className="map-location-card map-location-card--placeholder">
              <span className="map-location-info">
                <strong>Erro ao carregar</strong>
                <span>Não foi possível buscar seus estabelecimentos.</span>
              </span>
            </div>
          )}

          {!isBusy && status === 'empty' && (
            <div className="map-location-card map-location-card--placeholder">
              <span className="map-location-info">
                <strong>Nenhum local encontrado</strong>
                <span>Importe notas com CEP para vê-las no mapa.</span>
              </span>
            </div>
          )}

          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className={`map-location-card ${selectedId === loc.id ? 'map-location-card--active' : ''}`}
              onClick={() => focusLocation(loc)}
            >
              <span className="map-location-pin" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="map-location-info">
                <strong>{loc.label}</strong>
                <span>CEP {formatCep(loc.cep)}</span>
                <span className="map-location-address">{loc.address}</span>
                <span className="map-location-count">{loc.notasCount} nota(s)</span>
              </span>
            </button>
          ))}

          {failedCeps.length > 0 && (
            <span className="map-failed-note">
              Não localizados: {failedCeps.join(', ')}
            </span>
          )}
        </aside>

        <div className="map-canvas">
          {mapError ? (
            <div className="map-error">
              Não foi possível carregar o mapa. Verifique sua conexão com a internet e tente novamente.
            </div>
          ) : (
            <div ref={mapContainerRef} className="map-view" />
          )}
        </div>
      </div>

      {selectedLocation && (
        <section className="map-notas-panel">
          <div className="map-notas-header">
            <div>
              <h2 className="map-selected-title">
                Notas de {selectedLocation.label}
              </h2>
              <span className="map-selected-subtitle">
                CEP {formatCep(selectedLocation.cep)} · {selectedLocation.address}
              </span>
            </div>
            <span className="map-notas-badge">
              {selectedLocation.notasCount} nota(s)
            </span>
          </div>

          {selectedLocation.notas.length === 0 ? (
            <p className="text-secondary" style={{ margin: 0 }}>
              Nenhuma nota detalhada disponível para este local.
            </p>
          ) : (
            <div className="map-notas-list">
              {selectedLocation.notas.map((nota) => (
                <Link key={nota.id} to={`/notas/${nota.id}`} className="map-nota-row">
                  <span className="map-nota-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <span className="map-nota-main">
                    <strong>{formatBRL(nota.valor_total_nota)}</strong>
                    <span className="map-nota-sub">
                      {formatDate(nota.data_compra ?? nota.created_at)} · nº ...{nota.codigo_acesso.slice(-8)}
                    </span>
                  </span>
                  <span className="map-nota-arrow" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

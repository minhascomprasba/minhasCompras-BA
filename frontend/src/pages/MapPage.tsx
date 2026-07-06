import { useEffect, useRef, useState } from 'react';
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

// ---------------------------------------------------------------------------
// Geocodificação: CEP -> coordenadas
//   1) BrasilAPI (CEP v2) — costuma trazer as coordenadas exatas do CEP.
//   2) Nominatim/OpenStreetMap — usando o endereço do banco (busca estruturada).
// ---------------------------------------------------------------------------
interface CepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cleanCep = (cep: string) => cep.replace(/\D/g, '');
const enc = (v: string) => encodeURIComponent(v);
const formatCep = (cep: string) => {
  const c = cleanCep(cep);
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cep;
};

// Versão do cache: aumente para invalidar coordenadas antigas salvas no navegador.
const CACHE_VERSION = 'v2';

function readCache(cep: string): { lat: number; lng: number; address: string } | null {
  try {
    const raw = localStorage.getItem(`geocep:${CACHE_VERSION}:${cleanCep(cep)}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(cep: string, value: { lat: number; lng: number; address: string }) {
  try {
    localStorage.setItem(`geocep:${CACHE_VERSION}:${cleanCep(cep)}`, JSON.stringify(value));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

function formatAddress(a: CepAddress): string {
  const line1 = [a.logradouro, a.bairro].filter(Boolean).join(', ');
  const line2 = [a.localidade, a.uf].filter(Boolean).join(' - ');
  return [line1, line2].filter(Boolean).join(', ');
}

async function fetchBrasilApi(
  cep: string
): Promise<{ address: CepAddress; coords: { lat: number; lng: number } | null } | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/v2/cep/${cleanCep(cep)}`);
    if (!res.ok) return null;
    const d = await res.json();
    const address: CepAddress = {
      cep,
      logradouro: d.street ?? '',
      bairro: d.neighborhood ?? '',
      localidade: d.city ?? '',
      uf: d.state ?? '',
    };
    const c = d.location?.coordinates;
    const lat = c && c.latitude != null ? parseFloat(c.latitude) : NaN;
    const lng = c && c.longitude != null ? parseFloat(c.longitude) : NaN;
    const coords = !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : null;
    return { address, coords };
  } catch {
    return null;
  }
}

async function fetchViaCep(cep: string): Promise<CepAddress | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep(cep)}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.erro) return null;
    return {
      cep,
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      localidade: data.localidade ?? '',
      uf: data.uf ?? '',
    };
  } catch {
    return null;
  }
}

async function geocodeAddress(a: CepAddress): Promise<{ lat: number; lng: number } | null> {
  const base =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br';
  const urls: string[] = [];

  if (a.logradouro && a.localidade) {
    urls.push(
      `${base}&street=${enc(a.logradouro)}&city=${enc(a.localidade)}&state=${enc(a.uf)}&postalcode=${enc(cleanCep(a.cep))}`
    );
  }
  urls.push(`${base}&postalcode=${enc(cleanCep(a.cep))}&state=${enc(a.uf)}`);
  if (a.bairro && a.localidade) {
    urls.push(`${base}&q=${enc([a.bairro, a.localidade, a.uf, 'Brasil'].join(', '))}`);
  }
  if (a.localidade) {
    urls.push(`${base}&city=${enc(a.localidade)}&state=${enc(a.uf)}`);
  }

  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i], { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length > 0) {
          return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
        }
      }
    } catch {
      /* tenta a próxima consulta */
    }
    if (i < urls.length - 1) await sleep(1100);
  }
  return null;
}

async function geocodePonto(ponto: MapaPonto): Promise<ResolvedLocation | null> {
  const cep = (ponto.cep ?? '').trim();
  if (!cep) return null;

  const id = `est-${ponto.estabelecimento_id}`;
  const label = ponto.razao_social || 'Estabelecimento';

  const cached = readCache(cep);
  if (cached) {
    return { id, cep, label, notasCount: ponto.notas_count, notas: ponto.notas ?? [], ...cached };
  }

  // Endereço preferindo os dados do próprio banco.
  const dbAddress: CepAddress = {
    cep,
    logradouro: ponto.logradouro ?? '',
    bairro: ponto.bairro ?? '',
    localidade: ponto.cidade ?? '',
    uf: ponto.estado ?? '',
  };

  // Coordenadas: BrasilAPI primeiro (mais preciso para o CEP).
  const brasil = await fetchBrasilApi(cep);
  let coords = brasil?.coords ?? null;

  // Endereço para exibição/geocodificação: banco > BrasilAPI > ViaCEP.
  const address: CepAddress =
    dbAddress.localidade ? dbAddress : brasil?.address ?? (await fetchViaCep(cep)) ?? dbAddress;

  if (!coords) {
    coords = await geocodeAddress(address);
  }
  if (!coords) return null;

  const resolved = { address: formatAddress(address), lat: coords.lat, lng: coords.lng };
  writeCache(cep, resolved);
  return { id, cep, label, notasCount: ponto.notas_count, notas: ponto.notas ?? [], ...resolved };
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
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
  });

  const [locations, setLocations] = useState<ResolvedLocation[]>([]);
  const [failedCeps, setFailedCeps] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedId, setSelectedId] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // 1) Geocodifica os CEPs vindos da API (sequencial, respeitando o Nominatim).
  useEffect(() => {
    if (pontosError) {
      setStatus('error');
      return;
    }
    if (!pontos) {
      setStatus('loading');
      return;
    }
    if (pontos.length === 0) {
      setLocations([]);
      setStatus('empty');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      const resolved: ResolvedLocation[] = [];
      const failed: string[] = [];

      for (const ponto of pontos) {
        const loc = await geocodePonto(ponto);
        if (cancelled) return;
        if (loc) resolved.push(loc);
        else if (ponto.cep) failed.push(formatCep(ponto.cep));
      }

      if (cancelled) return;
      setLocations(resolved);
      setFailedCeps(failed);
      setSelectedId(resolved[0]?.id ?? '');
      setStatus(resolved.length > 0 ? 'ready' : 'empty');
    })();

    return () => {
      cancelled = true;
    };
  }, [pontos, pontosError]);

  // 2) Inicializa o mapa Leaflet uma única vez (aguardando o script do CDN).
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

  // 3) (Re)desenha os marcadores quando o mapa está pronto e os locais mudam.
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
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>Mapa das Compras</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Localização dos estabelecimentos onde suas notas foram emitidas, a partir do CEP.
          Clique em um marcador ou em um local da lista para ver os detalhes.
        </p>
      </div>

      <div className="map-layout">
        <aside className="map-sidebar">
          <span className="map-sidebar-title">
            {isBusy ? 'Localizando CEPs…' : `Locais (${locations.length})`}
          </span>

          {isBusy && (
            <div className="map-location-card map-location-card--placeholder">
              <span className="spinner" style={{ width: 18, height: 18 }} />
              <span className="map-location-info">
                <strong>Resolvendo endereços…</strong>
                <span>Convertendo CEP em coordenadas</span>
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
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>
                Notas de {selectedLocation.label}
              </h2>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                CEP {formatCep(selectedLocation.cep)} · {selectedLocation.address}
              </span>
            </div>
            <span className="map-notas-badge">
              {selectedLocation.notasCount} nota(s)
            </span>
          </div>

          {selectedLocation.notas.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
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

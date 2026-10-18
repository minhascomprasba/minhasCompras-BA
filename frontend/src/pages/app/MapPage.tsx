import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin as MapMarker } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretRight as ChevronRight, CircleNotch as LoaderCircle, MapPin, Receipt } from '@phosphor-icons/react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { mapaService, type MapaNota, type MapaPonto } from '../../features/mapa/mapaService';
import './MapPage.css';

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
  const navigate = useNavigate();
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

    const pinSvg = renderToStaticMarkup(<MapMarker width={30} height={40} weight="fill" color="#17c85f" aria-hidden="true" />);
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
    <div data-scope="map" className="container space-y-6 text-foreground">
      <header className="space-y-2">
        <h1 className="mb-0 text-2xl font-semibold text-foreground">Mapa das Compras</h1>
        <div className="text-sm text-muted-foreground">
          Localização dos estabelecimentos onde suas notas foram emitidas.
          Clique em um marcador ou em um local da lista para ver os detalhes.
        </div>
      </header>

      <div className="grid items-start gap-6 min-[861px]:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-labelledby="map-locations-title" className="min-w-0 space-y-3">
          <h2 id="map-locations-title" className="m-0 text-base font-medium text-foreground">
            {isBusy ? 'Carregando locais…' : `Locais (${locations.length})`}
          </h2>
          {isBusy && (
            <Card>
              <CardContent role="status" className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden="true" />
                <span>Buscando estabelecimentos com coordenadas…</span>
              </CardContent>
            </Card>
          )}
          {!isBusy && status === 'error' && (
            <Alert variant="destructive">Não foi possível buscar seus estabelecimentos.</Alert>
          )}
          {!isBusy && status === 'empty' && (
            <Card>
              <CardHeader>
                <CardTitle>Nenhum local encontrado</CardTitle>
                <CardDescription>Importe notas com CEP para vê-las no mapa.</CardDescription>
              </CardHeader>
            </Card>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1 min-[861px]:max-h-[65vh] min-[861px]:flex-col min-[861px]:overflow-y-auto min-[861px]:p-1">
            {locations.map(loc => (
              <Button
                key={loc.id}
                type="button"
                variant="outline"
                aria-pressed={selectedId === loc.id}
                className="h-auto w-64 shrink-0 items-start justify-start gap-3 p-4 text-left whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary/10 min-[861px]:w-full"
                onClick={() => focusLocation(loc)}
              >
                <MapPin className="mt-1 size-5 text-primary" aria-hidden="true" />
                <span className="flex min-w-0 flex-col gap-1 break-words">
                  <strong className="text-foreground">{loc.label}</strong>
                  <span className="text-xs text-muted-foreground">CEP {formatCep(loc.cep)}</span>
                  <span className="text-xs text-muted-foreground">{loc.address}</span>
                  <Badge variant="secondary">{loc.notasCount} nota(s)</Badge>
                </span>
              </Button>
            ))}
          </div>
          {failedCeps.length > 0 && <Alert className="border-amber-400/30 bg-amber-400/10 text-amber-300">Não localizados: {failedCeps.join(', ')}</Alert>}
        </aside>

        <Card className="relative z-0 min-w-0 py-0">
          {mapError ? (
            <div className="flex min-h-[420px] items-center p-6">
              <Alert variant="destructive">Não foi possível carregar o mapa. Verifique sua conexão com a internet e tente novamente.</Alert>
            </div>
          ) : (
            <div ref={mapContainerRef} role="region" aria-label="Mapa dos estabelecimentos" className="h-[55vh] min-h-[420px] w-full bg-card min-[861px]:h-[70vh]" />
          )}
        </Card>
      </div>

      {selectedLocation && (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="m-0 text-xl font-semibold break-words text-foreground">Notas de {selectedLocation.label}</h2>
              <CardDescription>CEP {formatCep(selectedLocation.cep)} · {selectedLocation.address}</CardDescription>
            </div>
            <Badge variant="secondary">{selectedLocation.notasCount} nota(s)</Badge>
          </CardHeader>
          <CardContent>
            {selectedLocation.notas.length === 0 ? (
              <div className="text-muted-foreground">Nenhuma nota detalhada disponível para este local.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedLocation.notas.map(nota => (
                  <Card key={nota.id}>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-5 text-primary" aria-hidden="true" />
                        <strong className="text-lg text-primary">{formatBRL(nota.valor_total_nota)}</strong>
                      </div>
                      <div className="text-sm text-muted-foreground">{formatDate(nota.data_compra ?? nota.created_at)}</div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Chave: </span>
                        <span className="font-mono break-all text-foreground select-text">{nota.codigo_acesso || 'Indisponível'}</span>
                      </div>
                      <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/notas/${nota.id}`)}>
                        Ver Detalhes <ChevronRight aria-hidden="true" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

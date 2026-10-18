import { Card } from '../../../components/ui/card';
import type { AdminTelemetria, QualidadeCatalogo, TelemetriaSlice } from '../types';
import { InfoTooltip } from './InfoTooltip';

const CHANNELS_TOOLTIP =
  'Formatos utilizados pelos usuários para ler a nota: QR Code pela câmera, foto ou chave digitada.';
const PAYMENTS_TOOLTIP =
  'Distribuição das formas de pagamento registradas nas notas fiscais.';
const CATALOG_TOOLTIP =
  'Mostra a proporção de produtos com e sem código de barras cadastrado nas notas fiscais do período.';

interface AdminTelemetryGridProps {
  telemetria: AdminTelemetria;
}

function buildGradient(slices: TelemetriaSlice[]): string {
  let acc = 0;
  const stops = slices.map((slice) => {
    const from = acc;
    acc += slice.percentual;
    return `${slice.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

interface DonutRingProps {
  slices: TelemetriaSlice[];
}

function DonutRing({ slices }: DonutRingProps) {
  return (
    <div
      className="relative size-28 shrink-0 rounded-full"
      aria-hidden="true"
      style={{ background: slices.some(slice => slice.percentual > 0) ? buildGradient(slices) : 'var(--muted)' }}
    >
      <div className="absolute inset-0 m-auto size-21 rounded-full bg-card" />
    </div>
  );
}

interface DonutLegendProps {
  slices: TelemetriaSlice[];
  total?: number;
}

function DonutLegend({ slices, total }: DonutLegendProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {slices.map((slice) => (
        <li key={slice.label} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="inline-block size-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
            {slice.label}
          </span>
          <span className="font-medium text-foreground tabular-nums">{slice.percentual}%</span>
        </li>
      ))}
      {total !== undefined && (
        <li className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">Total no período</span>
          <span className="font-medium text-foreground tabular-nums">{total}</span>
        </li>
      )}
    </ul>
  );
}

function CatalogQuality({ qualidade }: { qualidade: QualidadeCatalogo }) {
  const slices: TelemetriaSlice[] = [
    { label: 'Com código de barras', percentual: qualidade.comGtin, color: 'var(--brand-green)' },
    { label: 'Sem código de barras', percentual: qualidade.semGtin, color: 'var(--warning)' },
  ];

  return (
    <>
      <div className="flex h-32 items-center justify-center">
        <DonutRing slices={slices} />
      </div>
      <DonutLegend slices={slices} total={qualidade.produtosCatalogados} />
    </>
  );
}

export function AdminTelemetryGrid({ telemetria }: AdminTelemetryGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="gap-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium text-foreground">Canais de Entrada</h3>
          <InfoTooltip content={CHANNELS_TOOLTIP} />
        </div>
        <div className="flex h-32 items-center justify-center">
          <DonutRing slices={telemetria.canaisImportacao} />
        </div>
        <DonutLegend slices={telemetria.canaisImportacao} />
      </Card>

      <Card className="gap-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium text-foreground">Formas de Pagamento</h3>
          <InfoTooltip content={PAYMENTS_TOOLTIP} />
        </div>
        <div className="flex h-32 items-center justify-center">
          <DonutRing slices={telemetria.meiosPagamento} />
        </div>
        <DonutLegend slices={telemetria.meiosPagamento} />
      </Card>

      <Card className="gap-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-base font-medium text-foreground">Produtos com código de barras</h3>
          <InfoTooltip content={CATALOG_TOOLTIP} />
        </div>
        <CatalogQuality qualidade={telemetria.qualidadeCatalogo} />
      </Card>
    </div>
  );
}

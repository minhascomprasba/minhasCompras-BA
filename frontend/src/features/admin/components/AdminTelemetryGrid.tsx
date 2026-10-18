import './AdminTelemetryGrid.css';
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
      className="admin-donut-ring"
      style={{ background: buildGradient(slices) }}
    >
      <div className="admin-donut-hole" />
    </div>
  );
}

interface DonutLegendProps {
  slices: TelemetriaSlice[];
  total?: number;
}

function DonutLegend({ slices, total }: DonutLegendProps) {
  return (
    <ul className="admin-donut-legend">
      {slices.map((slice) => (
        <li key={slice.label} className="admin-donut-legend-item">
          <span className="admin-donut-legend-label">
            <span className="admin-donut-legend-color" style={{ background: slice.color }} />
            {slice.label}
          </span>
          <span className="admin-donut-legend-value">{slice.percentual}%</span>
        </li>
      ))}
      {total !== undefined && (
        <li className="admin-donut-legend-item">
          <span className="admin-donut-legend-label">Total no período</span>
          <span className="admin-donut-legend-value">{total}</span>
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
      <div className="admin-donut-wrapper">
        <DonutRing slices={slices} />
      </div>
      <DonutLegend slices={slices} total={qualidade.produtosCatalogados} />
    </>
  );
}

export function AdminTelemetryGrid({ telemetria }: AdminTelemetryGridProps) {
  return (
    <div className="admin-telemetry-grid">
      <div className="card admin-telemetry-card">
        <div className="admin-telemetry-title-row">
          <h3 className="admin-telemetry-title">Canais de Entrada</h3>
          <InfoTooltip content={CHANNELS_TOOLTIP} />
        </div>
        <div className="admin-donut-wrapper">
          <DonutRing slices={telemetria.canaisImportacao} />
        </div>
        <DonutLegend slices={telemetria.canaisImportacao} />
      </div>

      <div className="card admin-telemetry-card">
        <div className="admin-telemetry-title-row">
          <h3 className="admin-telemetry-title">Formas de Pagamento</h3>
          <InfoTooltip content={PAYMENTS_TOOLTIP} />
        </div>
        <div className="admin-donut-wrapper">
          <DonutRing slices={telemetria.meiosPagamento} />
        </div>
        <DonutLegend slices={telemetria.meiosPagamento} />
      </div>

      <div className="card admin-telemetry-card">
        <div className="admin-telemetry-title-row">
          <h3 className="admin-telemetry-title">Produtos com código de barras</h3>
          <InfoTooltip content={CATALOG_TOOLTIP} />
        </div>
        <CatalogQuality qualidade={telemetria.qualidadeCatalogo} />
      </div>
    </div>
  );
}

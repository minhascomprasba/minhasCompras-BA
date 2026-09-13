import type { AdminTelemetria, QualidadeCatalogo, TelemetriaSlice } from '../types';

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
  small?: boolean;
}

function DonutRing({ slices, small = false }: DonutRingProps) {
  return (
    <div
      className={`admin-donut-ring${small ? ' admin-donut-ring--small' : ''}`}
      style={{ background: buildGradient(slices) }}
    >
      <div className="admin-donut-hole" />
    </div>
  );
}

interface DonutLegendProps {
  slices: TelemetriaSlice[];
}

function DonutLegend({ slices }: DonutLegendProps) {
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
    </ul>
  );
}

function CatalogQuality({ qualidade }: { qualidade: QualidadeCatalogo }) {
  const slices: TelemetriaSlice[] = [
    { label: 'NCM Válido', percentual: qualidade.ncmValido, color: 'var(--brand-green)' },
    { label: 'Incompleto', percentual: qualidade.incompleto, color: 'var(--warning)' },
  ];

  return (
    <div className="admin-catalog-layout">
      <div className="admin-donut-wrapper">
        <DonutRing slices={slices} small />
      </div>
      <div className="admin-catalog-stats">
        <div>
          <p className="admin-catalog-stat-value admin-catalog-stat-value--success">
            {qualidade.ncmValido}%
          </p>
          <p className="admin-catalog-stat-label">NCM Válido</p>
        </div>
        <div>
          <p className="admin-catalog-stat-value admin-catalog-stat-value--warning">
            {qualidade.incompleto}%
          </p>
          <p className="admin-catalog-stat-label">Incompleto</p>
        </div>
      </div>
    </div>
  );
}

export function AdminTelemetryGrid({ telemetria }: AdminTelemetryGridProps) {
  return (
    <div className="admin-telemetry-grid">
      <div className="card admin-telemetry-card">
        <h3 className="admin-telemetry-title">Canais de Importação</h3>
        <div className="admin-donut-wrapper">
          <DonutRing slices={telemetria.canaisImportacao} />
        </div>
        <DonutLegend slices={telemetria.canaisImportacao} />
      </div>

      <div className="card admin-telemetry-card">
        <h3 className="admin-telemetry-title">Meios de Pagamento</h3>
        <div className="admin-donut-wrapper">
          <DonutRing slices={telemetria.meiosPagamento} />
        </div>
        <DonutLegend slices={telemetria.meiosPagamento} />
      </div>

      <div className="card admin-telemetry-card">
        <h3 className="admin-telemetry-title">Qualidade do Catálogo</h3>
        <CatalogQuality qualidade={telemetria.qualidadeCatalogo} />
      </div>
    </div>
  );
}
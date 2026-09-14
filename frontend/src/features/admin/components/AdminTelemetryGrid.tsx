import type { AdminTelemetria, QualidadeCatalogo, TelemetriaSlice } from '../types';
import { InfoTooltip } from './InfoTooltip';

const CHANNELS_TOOLTIP =
  'Direciona o esforço da equipe de desenvolvimento: se 70%+ dos usuários usam a câmera em tempo real, os devs priorizam a otimização de bibliotecas de vídeo móvel em vez de refatorar formulários de digitação.';
const PAYMENTS_TOOLTIP =
  'Dados sociológicos e de inclusão financeira: mostra a adesão do cidadão baiano a pagamentos instantâneos (PIX) versus meios tradicionais no varejo físico.';
const CATALOG_TOOLTIP =
  'Governança da base de dados: itens SEM GTIN exigem agrupamentos heurísticos por NCM e descrição. A proporção ajuda os pesquisadores a avaliar a precisão da catalogação.';

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
    { label: 'Com GTIN', percentual: qualidade.comGtin, color: 'var(--brand-green)' },
    { label: 'Sem GTIN', percentual: qualidade.semGtin, color: 'var(--warning)' },
  ];

  return (
    <div className="admin-catalog-layout">
      <div className="admin-donut-wrapper">
        <DonutRing slices={slices} small />
      </div>
      <div className="admin-catalog-stats">
        <div>
          <p className="admin-catalog-stat-value admin-catalog-stat-value--success">
            {qualidade.comGtin}%
          </p>
          <p className="admin-catalog-stat-label">Com GTIN</p>
        </div>
        <div>
          <p className="admin-catalog-stat-value admin-catalog-stat-value--warning">
            {qualidade.semGtin}%
          </p>
          <p className="admin-catalog-stat-label">Sem GTIN</p>
        </div>
      </div>
    </div>
  );
}

export function AdminTelemetryGrid({ telemetria }: AdminTelemetryGridProps) {
  return (
    <div className="admin-telemetry-grid">
      <div className="card admin-telemetry-card">
        <div className="admin-telemetry-title-row">
          <h3 className="admin-telemetry-title">Canais de Importação</h3>
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
          <h3 className="admin-telemetry-title">Qualidade do Catálogo (GTIN)</h3>
          <InfoTooltip content={CATALOG_TOOLTIP} />
        </div>
        <CatalogQuality qualidade={telemetria.qualidadeCatalogo} />
      </div>
    </div>
  );
}
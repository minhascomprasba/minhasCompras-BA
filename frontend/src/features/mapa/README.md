# Feature: mapa

Mapa das compras: agrupa as notas do usuário por estabelecimento e as posiciona geograficamente. Renderizado em `MapPage` (`/mapa`), com Leaflet carregado via CDN (consumido como `window.L`, não é dependência npm).

## Estrutura

```
mapa/
├── mapaService.ts   # Serviço GET /mapa + DTOs MapaPonto/MapaNota co-localizados
└── README.md
```

Feature mínima: sem `hooks/` nem `components/`. A UI vive em `src/pages/MapPage.tsx`, que consome o serviço diretamente.

## API pública

### Serviço — `mapaService.ts`

```ts
interface MapaNota {
  id: number;                  // id da nota → link para /notas/:id
  codigo_acesso: string;
  data_compra?: string | null;
  created_at: string;
  valor_total_nota: number;
}

interface MapaPonto {
  estabelecimento_id: number;
  razao_social: string;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  notas_count: number;
  notas: MapaNota[];
}

const mapaService = {
  getPontos(): Promise<MapaPonto[]>; // GET /mapa — um ponto por estabelecimento com notas
};
```

## Complementos fora da feature (`src/pages/MapPage.tsx`)

A página combina o serviço interno com geocodificação externa para converter os CEPs dos pontos em coordenadas:

- **Cadeia de geocodificação** (raw `fetch`, sem axios): BrasilAPI → Nominatim (busca estruturada por endereço) → ViaCEP como fallback.
- **Cache versionado em localStorage**: chave `geocep:v2:<cep>` — evita reconsultar CEPs já resolvidos e respeitar rate limits das APIs gratuitas; a resolução é feita sequencialmente, não em paralelo.
- **Leaflet via CDN**: `window.L` declarado globalmente (`declare global { interface Window { L: any } }`); o CSS/JS vem do `index.html` com SRI. Popups/controles recebem overrides de tema escuro no `src/index.css`.

## Notas

- Única feature cujo arquivo de serviço mantém seus DTOs no mesmo arquivo (em vez de um `types.ts` separado) — convenção aceita para features pequenas.
- Erros do endpoint interno chegam normalizados como `AppError`; falhas de geocodificação são tratadas localmente na página (ponto fica sem coordenada).

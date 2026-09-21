import { apiClient } from '../../shared/api/client';

export interface MapaNota {
  id: number;
  codigo_acesso: string;
  data_compra?: string | null;
  created_at: string;
  valor_total_nota: number;
}

export interface MapaPonto {
  estabelecimento_id: number;
  razao_social: string;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  endereco?: string | null;
  notas_count: number;
  notas: MapaNota[];
}

export const mapaService = {
  async getPontos(): Promise<MapaPonto[]> {
    const response = await apiClient.get<MapaPonto[]>('/mapa');
    return response.data;
  },
};

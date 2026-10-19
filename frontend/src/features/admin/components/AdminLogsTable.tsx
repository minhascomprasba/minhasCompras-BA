import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import type { AdminLog, LogStatus } from '../types';
import { InfoTooltip } from './InfoTooltip';

const TOOLTIP =
  'Histórico das ocorrências de erro ou tempo limite durante as consultas de notas na SEFAZ.';

interface AdminLogsTableProps {
  logs: AdminLog[];
}

const statusConfig: Record<LogStatus, { badgeClass: string; label: string }> = {
  scraper_falha: { badgeClass: 'border-red-400/30 bg-red-400/10 text-red-300', label: 'Falha na Consulta' },
  captcha_expirado: { badgeClass: 'border-amber-400/30 bg-amber-400/10 text-amber-300', label: 'Tempo Esgotado' },
  limite_captcha: { badgeClass: 'border-red-400/30 bg-red-400/10 text-red-300', label: 'Tentativas Excedidas' },
  timeout_sefaz: { badgeClass: 'border-red-400/30 bg-red-400/10 text-red-300', label: 'Sem Resposta SEFAZ' },
};

const fallbackStatus = { badgeClass: '', label: 'Indefinido' };

export function AdminLogsTable({ logs }: AdminLogsTableProps) {
  return (
    <Card className="gap-4 px-4">
      <div className="space-y-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 text-base font-medium text-foreground">Registro de Ocorrências</h3>
            <InfoTooltip content={TOOLTIP} />
          </div>
          <div className="m-0 text-sm text-muted-foreground">Últimas tentativas de importação que não puderam ser concluídas</div>
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <Table aria-label="Registro de ocorrências">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Data/Hora</TableHead>
              <TableHead scope="col">Nota Fiscal</TableHead>
              <TableHead scope="col">Tentativas</TableHead>
              <TableHead scope="col">Motivo / Ocorrência</TableHead>
              <TableHead scope="col">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma ocorrência registrada no período. Todas as importações foram concluídas com sucesso.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const status = statusConfig[log.status] ?? fallbackStatus;
                return (
                  <TableRow key={log.importId}>
                    <TableCell className="font-mono text-xs break-all text-foreground select-text">{log.dataHora}</TableCell>
                    <TableCell className="font-mono text-xs break-all text-foreground select-text">{log.idNota}</TableCell>
                    <TableCell>{log.tentativas}</TableCell>
                    <TableCell>{log.erro}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`h-auto whitespace-normal ${status.badgeClass}`}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

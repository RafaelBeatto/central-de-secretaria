/** Relatório de atividades (back: relatorios/dto/RelatorioAtividades). */
import type { TipoEvento } from './agenda';

export type SecaoRelatorio = 'secretaria' | 'agenda' | 'atendimentos' | 'documentos' | 'projetos';

export const SECOES_RELATORIO: [SecaoRelatorio, string][] = [
  ['secretaria', 'Secretaria'],
  ['agenda', 'Agenda'],
  ['atendimentos', 'Atendimentos'],
  ['documentos', 'Documentos'],
  ['projetos', 'Projetos'],
];

export interface RelatorioAtividades {
  de: string;
  ate: string;
  secretaria: {
    criadas: number;
    abertas: number;
    concluidas: { dia: string; titulo: string; responsavel: string | null }[];
    atrasadas: { prazo: string; titulo: string; responsavel: string | null }[];
  } | null;
  agenda: {
    realizados: number;
    compromissos: { data: string; horario: string | null; titulo: string; tipo: TipoEvento; local: string | null; realizado: boolean }[];
  } | null;
  atendimentos: {
    total: number;
    alunos: number;
    veio: number;
    faltou: number;
    semRegistro: number;
    taxa: number | null;
    profissionais: { nome: string; alunos: number; atendimentos: number; veio: number; faltou: number }[];
    motivos: { rotulo: string; quantidade: number }[];
  } | null;
  documentos: {
    total: number;
    cadastrados: number;
    renovados: { dia: string; nome: string; validade: string | null }[];
    situacao: { nome: string; validade: string; dias: number }[];
  } | null;
  projetos: {
    recursos: { nome: string; recebido: number; pago: number; disponivel: number }[];
    pagamentos: { data: string; execucao: string; recurso: string; fornecedor: string | null; valor: number }[];
    totalPago: number;
  } | null;
}

/** Projetos: recursos (dinheiro que entrou) → execuções (back: projetos/*). */
import type { Prioridade } from './comum';
import type { ExigenciaApae } from './documentos';
import type { Empresa } from './empresas';

export type StatusRecurso = 'AGUARDANDO_EXECUCAO' | 'EM_EXECUCAO' | 'PARCIALMENTE_DISTRIBUIDO' | 'COM_PENDENCIAS' | 'ENCERRADO';
export type StatusExecucao = 'PLANEJAMENTO' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'SUSPENSO' | 'CANCELADO';
export type TipoMovimentacao = 'ENTRADA' | 'DISTRIBUICAO' | 'PAGAMENTO' | 'TRANSFERENCIA' | 'AJUSTE';
export type StatusOrdemCompra = 'RASCUNHO' | 'EMITIDA' | 'RECEBIDA' | 'CANCELADA';
export type CategoriaDocumentoExecucao = 'NOTA_FISCAL' | 'COMPROVANTE' | 'RELATORIO' | 'DECLARACAO' | 'OUTRO';
/** Seções da execução (as etapas do checklist apontam para uma delas). */
export type SecaoExecucao = 'resumo' | 'plano' | 'empresas' | 'docs-apae' | 'documentos' | 'pagamentos' | 'pendencias';

export const ROTULO_STATUS_RECURSO: Record<StatusRecurso, string> = {
  AGUARDANDO_EXECUCAO: 'Aguardando execução',
  EM_EXECUCAO: 'Em execução',
  PARCIALMENTE_DISTRIBUIDO: 'Parcialmente distribuído',
  COM_PENDENCIAS: 'Com pendências',
  ENCERRADO: 'Encerrado',
};
export const ROTULO_STATUS_EXECUCAO: Record<StatusExecucao, string> = {
  PLANEJAMENTO: 'Planejamento',
  EM_EXECUCAO: 'Em execução',
  CONCLUIDO: 'Concluído',
  SUSPENSO: 'Suspenso',
  CANCELADO: 'Cancelado',
};
export const ROTULO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  ENTRADA: 'Entrada do recurso',
  DISTRIBUICAO: 'Distribuição para execução',
  PAGAMENTO: 'Pagamento',
  TRANSFERENCIA: 'Transferência entre execuções',
  AJUSTE: 'Ajuste',
};
export const ROTULO_STATUS_ORDEM: Record<StatusOrdemCompra, string> = {
  RASCUNHO: 'Rascunho',
  EMITIDA: 'Emitida',
  RECEBIDA: 'Recebida',
  CANCELADA: 'Cancelada',
};
export const ROTULO_CATEGORIA_DOC_EXECUCAO: Record<CategoriaDocumentoExecucao, string> = {
  NOTA_FISCAL: 'Nota fiscal',
  COMPROVANTE: 'Comprovante',
  RELATORIO: 'Relatório',
  DECLARACAO: 'Declaração',
  OUTRO: 'Outro',
};

export interface FinanceiroRecurso {
  recebido: number;
  distribuido: number;
  pago: number;
  naoDistribuido: number;
  saldoExecucoes: number;
  disponivel: number;
  percentualDistribuicao: number;
  percentualExecucao: number;
}

export interface Etapa {
  rotulo: string;
  ok: boolean;
  secao: SecaoExecucao;
}

export interface SituacaoExecucao {
  planejado: number;
  pago: number;
  saldo: number;
  percentualPago: number;
  etapas: Etapa[];
  etapasFeitas: number;
  proximoPasso: Etapa | null;
}

export interface ExecucaoResumo {
  id: number;
  recursoId: number;
  recursoNome: string;
  codigo: string;
  nome: string;
  status: StatusExecucao;
  responsavel: string | null;
  dataInicio: string;
  dataFim: string;
  situacao: SituacaoExecucao;
}

export interface RecursoResumo {
  id: number;
  codigo: string;
  nome: string;
  fonteRecurso: string;
  orgaoRepassador: string | null;
  status: StatusRecurso;
  arquivado: boolean;
  financeiro: FinanceiroRecurso;
  execucoes: ExecucaoResumo[];
}

export interface DocumentoRecurso {
  id: number;
  nome: string;
  observacao: string | null;
  data: string;
  arquivoId: number;
}

export interface Movimentacao {
  id: number;
  tipo: TipoMovimentacao;
  valor: number;
  descricao: string | null;
  data: string;
  criadoEm: string;
}

export interface RecursoDetalhe extends Omit<RecursoResumo, 'execucoes'> {
  convenio: string | null;
  dataRecebimento: string | null;
  dataInicio: string;
  dataFim: string;
  valorRecebido: number;
  contaBancaria: string | null;
  responsavel: string | null;
  finalidade: string | null;
  observacoes: string | null;
  execucoes: ExecucaoResumo[];
  documentos: DocumentoRecurso[];
  movimentacoes: Movimentacao[];
  atualizadoEm: string;
}

export interface ItemCotacao {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Cotacao {
  id: number;
  empresaId: number;
  data: string | null;
  valorTotal: number;
  observacao: string | null;
  vencedora: boolean;
  arquivoId: number;
  itens: ItemCotacao[];
}

export interface OrdemCompra {
  id: number;
  cotacaoId: number;
  numero: string;
  data: string | null;
  valor: number;
  status: StatusOrdemCompra;
  arquivoId: number;
}

export interface DocumentoExecucao {
  id: number;
  nome: string;
  categoria: CategoriaDocumentoExecucao;
  data: string | null;
  arquivoId: number;
}

export interface Pagamento {
  id: number;
  empresaId: number | null;
  fornecedor: string | null;
  data: string | null;
  valor: number;
  forma: string | null;
  arquivoId: number;
}

export interface PendenciaExecucao {
  id: number;
  titulo: string;
  prioridade: Prioridade;
  descricao: string | null;
  concluida: boolean;
}

export interface DocumentoApae {
  exigencia: ExigenciaApae;
  documentoId: number | null;
  nome: string | null;
  dataValidade: string | null;
  arquivoId: number | null;
  ok: boolean;
}

export interface EmpresaVinculada {
  vinculoId: number;
  empresa: Empresa;
}

export interface ExecucaoDetalhe {
  id: number;
  recursoId: number;
  recursoNome: string;
  recursoArquivado: boolean;
  codigo: string;
  nome: string;
  fonteRecurso: string;
  convenio: string | null;
  dataInicio: string;
  dataFim: string;
  valorPlanejado: number;
  responsavel: string | null;
  status: StatusExecucao;
  objetivo: string | null;
  observacoes: string | null;
  planoDescricao: string | null;
  planoArquivoId: number | null;
  situacao: SituacaoExecucao;
  empresas: EmpresaVinculada[];
  cotacoes: Cotacao[];
  ordens: OrdemCompra[];
  documentos: DocumentoExecucao[];
  pagamentos: Pagamento[];
  pendencias: PendenciaExecucao[];
  documentacaoApae: DocumentoApae[];
  atualizadoEm: string;
}

export interface EmpresaNosProjetos {
  execucoes: ExecucaoResumo[];
  cotacoes: { id: number; execucaoId: number; execucaoNome: string; data: string | null; valorTotal: number; vencedora: boolean; arquivoId: number }[];
  ordens: { id: number; execucaoId: number; execucaoNome: string; numero: string; data: string | null; valor: number; status: StatusOrdemCompra; arquivoId: number }[];
}

// ----- formulários (datas vazias = '') -----

export interface RequisicaoRecurso {
  nome: string;
  fonteRecurso: string;
  orgaoRepassador: string;
  convenio: string;
  dataRecebimento: string;
  dataInicio: string;
  dataFim: string;
  valorRecebido: number | '';
  contaBancaria: string;
  responsavel: string;
  status: StatusRecurso;
  finalidade: string;
  observacoes: string;
}

export interface RequisicaoExecucao {
  nome: string;
  fonteRecurso: string;
  convenio: string;
  dataInicio: string;
  dataFim: string;
  valorPlanejado: number | '';
  responsavel: string;
  status: StatusExecucao;
  objetivo: string;
  observacoes: string;
}

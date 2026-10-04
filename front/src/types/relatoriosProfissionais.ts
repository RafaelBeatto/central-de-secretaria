/** Relatórios em PDF de professores/profissionais (back: relatorios/profissional). */
export type StatusRelatorio = 'PENDENTE' | 'ENTREGUE';

export const ROTULO_STATUS_RELATORIO: Record<StatusRelatorio, string> = {
  PENDENTE: 'Pendente',
  ENTREGUE: 'Entregue',
};

export type TipoRelatorio = 'PESSOAL' | 'GERAL';

/** O primeiro é o sugerido no formulário. */
export const ROTULO_TIPO_RELATORIO: Record<TipoRelatorio, string> = {
  PESSOAL: 'Pessoal (de um aluno)',
  GERAL: 'Geral',
};

export interface RelatorioProfissional {
  id: number;
  usuarioId: number;
  nomeUsuario: string;
  cargoNome: string;
  nome: string;
  tipo: TipoRelatorio;
  nomeAluno: string | null;
  complemento: string | null;
  periodoInicio: string;
  periodoFim: string;
  nomeArquivo: string | null;
  tamanhoBytes: number | null;
  status: StatusRelatorio;
  /** Quando foi cobrado (só nas cobranças). */
  solicitadoEm: string | null;
  /** Nulo enquanto Pendente. */
  enviadoEm: string | null;
}

/** Linha da Central: um professor/profissional e o total de relatórios dentro dos filtros. */
export interface ProfissionalCentral {
  usuarioId: number;
  nome: string;
  cargo: string;
  /** Relatórios entregues. */
  total: number;
  pendentes: number;
}

/** Período vazio = o back usa a data de hoje. */
export interface RequisicaoRelatorioProfissional {
  nome: string;
  tipo: TipoRelatorio;
  nomeAluno: string;
  complemento: string;
  periodoInicio: string;
  periodoFim: string;
  arquivoId: number | null;
}

export type RequisicaoCobrancaRelatorio = Pick<RequisicaoRelatorioProfissional, 'nome' | 'tipo' | 'nomeAluno' | 'complemento'>;
export type RequisicaoEntregaRelatorio = Pick<RequisicaoRelatorioProfissional, 'periodoInicio' | 'periodoFim' | 'arquivoId'>;

export interface FiltrosCentral {
  busca: string;
  /** '' = todos os anos */
  ano: string;
  de: string;
  ate: string;
  /** '' = todos */
  status: '' | StatusRelatorio;
}

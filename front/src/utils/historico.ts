import type { HistoricoRegistro } from 'src/types/comum';

/** Áreas do histórico (back: ModuloHistorico) com o rótulo da tela. */
export const ROTULO_MODULO_HISTORICO: Record<string, string> = {
  SECRETARIA: 'Secretaria',
  AGENDA: 'Agenda',
  DOCUMENTOS: 'Documentos',
  PROJETOS: 'Projetos',
  EMPRESAS: 'Empresas',
  ATENDIMENTOS: 'Atendimentos',
  GERADOR: 'Gerador',
  USUARIOS: 'Usuários',
  UNIDADES: 'Unidades',
  PERMISSOES: 'Permissões',
};

export const ROTULO_ACAO_HISTORICO: Record<string, string> = {
  CRIACAO: 'Criação',
  EDICAO: 'Edição',
  EXCLUSAO: 'Exclusão',
  CONCLUSAO: 'Conclusão',
  REABERTURA: 'Reabertura',
  MOVIMENTACAO: 'Movimentação',
  RENOVACAO: 'Renovação',
  ARQUIVAMENTO: 'Arquivamento',
  TRANSFERENCIA: 'Transferência',
  PAGAMENTO: 'Pagamento',
  COTACAO: 'Cotação',
  ORDEM_COMPRA: 'Ordem de compra',
  DOCUMENTO: 'Documento',
  VINCULO: 'Vínculo',
  DESVINCULO: 'Desvínculo',
  PRESENCA: 'Presença',
};

/** Rota do registro de uma linha (null = não há tela para abrir, como usuários e permissões). */
export function destinoDoHistorico(h: Pick<HistoricoRegistro, 'refTipo' | 'refId'>): string | null {
  const id = h.refId;
  if (!id || !h.refTipo) return null;
  switch (h.refTipo) {
    case 'TAREFA':
      return `/secretaria?tarefa=${id}`;
    case 'EVENTO':
      return '/agenda';
    case 'DOCUMENTO':
      return `/documentos?documento=${id}`;
    case 'EMPRESA':
      return `/empresas?empresa=${id}`;
    case 'RECURSO':
      return `/projetos?recurso=${id}`;
    case 'EXECUCAO':
      return `/projetos?execucao=${id}`;
    case 'ATENDIMENTO':
    case 'ALUNO':
    case 'PROFISSIONAL':
      return '/atendimentos';
    case 'DOCUMENTO_GERADO':
      return `/gerador?documento=${id}`;
    default:
      return null;
  }
}

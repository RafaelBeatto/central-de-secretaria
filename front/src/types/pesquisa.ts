/** Pesquisa geral (back: pesquisa/dto/ResultadoPesquisa). */
export type TipoResultado = 'TAREFA' | 'EVENTO' | 'DOCUMENTO' | 'GERADO' | 'RECURSO' | 'EXECUCAO' | 'EMPRESA' | 'ALUNO' | 'PROFISSIONAL';

export interface ResultadoPesquisa {
  tipo: TipoResultado;
  id: number;
  titulo: string;
  detalhes: string[];
}

export const ROTULO_TIPO_PESQUISA: Record<TipoResultado, string> = {
  TAREFA: 'Tarefas',
  EVENTO: 'Agenda',
  DOCUMENTO: 'Documentos',
  GERADO: 'Documentos gerados',
  RECURSO: 'Recursos',
  EXECUCAO: 'Execuções',
  EMPRESA: 'Empresas',
  ALUNO: 'Alunos',
  PROFISSIONAL: 'Profissionais',
};

/** Ordem dos grupos na tela (a mesma do antigo, com alunos e profissionais no fim). */
export const ORDEM_TIPOS_PESQUISA: TipoResultado[] = ['TAREFA', 'EVENTO', 'DOCUMENTO', 'GERADO', 'RECURSO', 'EXECUCAO', 'EMPRESA', 'ALUNO', 'PROFISSIONAL'];

/** Rota do registro de um resultado. */
export function destinoDoResultado(r: Pick<ResultadoPesquisa, 'tipo' | 'id'>): string {
  switch (r.tipo) {
    case 'TAREFA':
      return `/secretaria?tarefa=${r.id}`;
    case 'EVENTO':
      return '/agenda';
    case 'DOCUMENTO':
      return `/documentos?documento=${r.id}`;
    case 'GERADO':
      return `/gerador?documento=${r.id}`;
    case 'RECURSO':
      return `/projetos?recurso=${r.id}`;
    case 'EXECUCAO':
      return `/projetos?execucao=${r.id}`;
    case 'EMPRESA':
      return `/empresas?empresa=${r.id}`;
    default:
      return '/atendimentos';
  }
}

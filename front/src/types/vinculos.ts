/** Vínculos livres entre tarefa, documento, empresa e execução (back: vinculos/*). */
export type TipoRegistro = 'TAREFA' | 'DOCUMENTO' | 'EMPRESA' | 'EXECUCAO';

export interface Vinculado {
  tipo: TipoRegistro;
  id: number;
  titulo: string;
  detalhe: string | null;
}

export const ROTULO_TIPO_REGISTRO: Record<TipoRegistro, string> = {
  TAREFA: 'Tarefas',
  DOCUMENTO: 'Documentos',
  EMPRESA: 'Empresas',
  EXECUCAO: 'Execuções de projeto',
};

export const ROTULO_UM_REGISTRO: Record<TipoRegistro, string> = {
  TAREFA: 'tarefa',
  DOCUMENTO: 'documento',
  EMPRESA: 'empresa',
  EXECUCAO: 'execução',
};

/** Empresa ↔ execução já se ligam em Projetos ("Ligar empresa"), então não entram como vínculo livre. */
export const podeLigar = (a: TipoRegistro, b: TipoRegistro) =>
  a !== b && !(a === 'EXECUCAO' && b === 'EMPRESA') && !(a === 'EMPRESA' && b === 'EXECUCAO');

export function destinoDoVinculo(v: Pick<Vinculado, 'tipo' | 'id'>) {
  switch (v.tipo) {
    case 'TAREFA':
      return `/secretaria?tarefa=${v.id}`;
    case 'DOCUMENTO':
      return `/documentos?documento=${v.id}`;
    case 'EMPRESA':
      return `/empresas?empresa=${v.id}`;
    default:
      return `/projetos?execucao=${v.id}`;
  }
}

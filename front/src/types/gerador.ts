import type { ArquivoResposta } from './acesso';

export type FormatoModelo = 'HTML' | 'TEXTO';
export type TipoVinculo = 'EMPRESA' | 'EXECUCAO' | 'ALUNO' | 'ATENDIMENTO' | 'DOCUMENTO' | 'TAREFA';

export const ROTULO_VINCULO: Record<TipoVinculo, string> = {
  EMPRESA: 'Empresa',
  EXECUCAO: 'Projeto (execução)',
  ALUNO: 'Aluno',
  ATENDIMENTO: 'Atendimento',
  DOCUMENTO: 'Documento',
  TAREFA: 'Tarefa / Solicitação',
};

export interface ModeloDocumento {
  id: number;
  nome: string;
  titulo: string | null;
  serie: string | null;
  texto: string;
  formato: FormatoModelo;
  espacamento: string | null;
  doSistema: boolean;
  usos: number;
  /** Prévia da numeração ("003/2026"), só nos modelos que usam {NUMERO}. */
  proximoNumero: string | null;
}

export interface RequisicaoModelo {
  nome: string;
  titulo: string;
  serie: string;
  texto: string;
  espacamento: string;
}

export type Campos = Record<string, string>;
export type Assinaturas = string[][];

export interface DocumentoGeradoItem {
  id: number;
  modeloId: number | null;
  modeloNome: string;
  titulo: string | null;
  numero: string | null;
  dataGeracao: string;
  versao: number;
  vinculoTipo: TipoVinculo | null;
  vinculoId: number | null;
  vinculoRotulo: string | null;
  valores: Campos;
  contexto: Campos;
  assinaturas: Assinaturas;
  totalAnexos: number;
}

export interface VersaoDocumentoGerado {
  versao: number;
  texto: string;
  valores: Campos;
  contexto: Campos;
  assinaturas: Assinaturas;
  salvoEm: string;
}

export interface DocumentoGerado {
  id: number;
  modeloId: number | null;
  modeloNome: string;
  titulo: string | null;
  numero: string | null;
  texto: string;
  formato: FormatoModelo;
  espacamento: string | null;
  dataGeracao: string;
  versao: number;
  vinculoTipo: TipoVinculo | null;
  vinculoId: number | null;
  vinculoRotulo: string | null;
  valores: Campos;
  contexto: Campos;
  assinaturas: Assinaturas;
  anexos: ArquivoResposta[];
  versoes: VersaoDocumentoGerado[];
}

export interface RequisicaoDocumentoGerado {
  modeloId?: number;
  valores: Campos;
  contexto: Campos;
  assinaturas: Assinaturas;
  vinculoTipo: TipoVinculo | null;
  vinculoId: number | null;
  vinculoRotulo: string | null;
}

/** Registro que pode ser ligado a um documento (e de onde vêm os campos preenchidos sozinhos). */
export interface RegistroVinculo {
  id: number;
  rotulo: string;
  dados: () => Promise<Campos>;
}

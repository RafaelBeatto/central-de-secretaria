/** Documentos institucionais (back: documentos/*). */

export type CategoriaDocumento =
  | 'CERTIDAO'
  | 'OFICIO'
  | 'ATA'
  | 'CONTRATO'
  | 'RELATORIO'
  | 'DECLARACAO'
  | 'COMPROVANTE'
  | 'DOCUMENTO_FINANCEIRO'
  | 'DOCUMENTO_INSTITUCIONAL'
  | 'CONVENIO'
  | 'OUTROS';

export const ROTULO_CATEGORIA_DOCUMENTO: Record<CategoriaDocumento, string> = {
  CERTIDAO: 'Certidão',
  OFICIO: 'Ofício',
  ATA: 'Ata',
  CONTRATO: 'Contrato',
  RELATORIO: 'Relatório',
  DECLARACAO: 'Declaração',
  COMPROVANTE: 'Comprovante',
  DOCUMENTO_FINANCEIRO: 'Documento financeiro',
  DOCUMENTO_INSTITUCIONAL: 'Documento institucional',
  CONVENIO: 'Convênio',
  OUTROS: 'Outros',
};

/** Documentos que os projetos exigem da instituição (old: DOCS_APAE_OBRIGATORIOS). */
export type ExigenciaApae =
  | 'CNPJ'
  | 'ESTATUTO'
  | 'ATA_ELEICAO_POSSE'
  | 'CERTIDAO_FEDERAL'
  | 'CERTIDAO_ESTADUAL'
  | 'CERTIDAO_MUNICIPAL'
  | 'FGTS'
  | 'CNDT';

export const ROTULO_EXIGENCIA_APAE: Record<ExigenciaApae, string> = {
  CNPJ: 'CNPJ',
  ESTATUTO: 'Estatuto',
  ATA_ELEICAO_POSSE: 'Ata de eleição/posse',
  CERTIDAO_FEDERAL: 'Certidão federal',
  CERTIDAO_ESTADUAL: 'Certidão estadual',
  CERTIDAO_MUNICIPAL: 'Certidão municipal',
  FGTS: 'FGTS',
  CNDT: 'CNDT',
};

export interface DocumentoVersao {
  id: number;
  numero: string | null;
  dataEmissao: string | null;
  dataValidade: string | null;
  arquivoId: number | null;
  substituidaEm: string;
}

export interface Documento {
  id: number;
  codigo: string;
  nome: string;
  categoria: CategoriaDocumento;
  exigenciaApae: ExigenciaApae | null;
  numero: string | null;
  orgao: string | null;
  responsavel: string | null;
  dataEmissao: string | null;
  dataValidade: string | null;
  localGuardado: string | null;
  tags: string | null;
  descricao: string | null;
  observacoes: string | null;
  arquivoId: number | null;
  /** Vem preenchida só no detalhe (a lista não traz as versões). */
  versoes: DocumentoVersao[];
  criadoEm: string;
  atualizadoEm: string;
}

/** Valores do formulário: datas vazias e "não vale como exigência" são ''. */
export interface RequisicaoDocumento {
  nome: string;
  categoria: CategoriaDocumento;
  exigenciaApae: ExigenciaApae | '';
  numero: string;
  orgao: string;
  responsavel: string;
  dataEmissao: string;
  dataValidade: string;
  localGuardado: string;
  tags: string;
  descricao: string;
  observacoes: string;
  arquivoId: number | null;
}

export interface RequisicaoRenovarDocumento {
  dataEmissao: string;
  dataValidade: string;
  numero: string;
  arquivoId: number | null;
}

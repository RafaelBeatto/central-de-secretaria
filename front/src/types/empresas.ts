/** Empresas (fornecedores) e os documentos da ficha (back: empresas/*). */

export interface EmpresaDocumento {
  id: number;
  nome: string;
  dataValidade: string | null;
  observacao: string | null;
  arquivoId: number;
  criadoEm: string;
}

export interface Empresa {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  representante: string | null;
  cpfRepresentante: string | null;
  observacao: string | null;
  documentos: EmpresaDocumento[];
  criadoEm: string;
  atualizadoEm: string;
}

/** Mesmo CNPJ ou razão social já cadastrados devolvem a existente (jaExistia = true). */
export interface EmpresaCriada {
  empresa: Empresa;
  jaExistia: boolean;
}

export interface RequisicaoEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  municipio: string;
  uf: string;
  representante: string;
  cpfRepresentante: string;
  observacao: string;
}

export interface RequisicaoEmpresaDocumento {
  nome: string;
  dataValidade: string;
  observacao: string;
  arquivoId: number | null;
}

/** Sugestões de documento da ficha (old: EMPRESA_DOCS_SUGERIDOS). */
export const DOCUMENTOS_EMPRESA_SUGERIDOS = [
  'CNPJ',
  'Contrato Social',
  'CND Federal',
  'CND Estadual',
  'CND Municipal',
  'FGTS',
  'CNDT',
  'Outros documentos',
];

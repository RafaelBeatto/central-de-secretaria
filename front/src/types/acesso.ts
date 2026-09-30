/** Tipos espelhando os DTOs do back (pacote acesso). */

export type TipoUnidade = 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';

export interface UsuarioSessao {
  id: number;
  login: string;
  nome: string;
  nomeCompleto: string;
  cargo: { codigo: string; nome: string; nivel: number };
  unidade: { id: number; nome: string; tipo: TipoUnidade };
  trocarSenha: boolean;
  permissoes: string[];
}

export interface RespostaSessao {
  tokenAcesso: string;
  acessoExpiraEm: string;
  tokenRenovacao: string;
  usuario: UsuarioSessao;
}

export interface UnidadeResumo {
  id: number;
  nome: string;
  tipo: TipoUnidade;
  uf: string | null;
  municipio: string | null;
  unidadePaiId: number | null;
  profundidade: number;
  ativo: boolean;
}

export interface UnidadeDetalhe {
  id: number;
  nome: string;
  tipo: TipoUnidade;
  uf: string | null;
  municipio: string | null;
  unidadePaiId: number | null;
  ativo: boolean;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  cidadeUf: string | null;
  site: string | null;
  presidente: string | null;
  cpfPresidente: string | null;
  rodapeTexto: string | null;
  rodapeEndereco: boolean;
  rodapeTelefone: boolean;
  rodapeEmail: boolean;
  rodapeSite: boolean;
  rodapeMostrarPagina: boolean;
  logoArquivoId: number | null;
}

export interface Cargo {
  id: number;
  codigo: string;
  nome: string;
  nivel: number;
}

export interface UsuarioResumo {
  id: number;
  login: string;
  nomeCompleto: string;
  cargoCodigo: string;
  cargoNome: string;
  unidadeId: number;
  unidadeNome: string;
  ativo: boolean;
  ultimoAcessoEm: string | null;
}

export interface UsuarioDetalhe {
  id: number;
  login: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string | null;
  dataNascimento: string;
  cargoId: number;
  cargoNome: string;
  unidadeId: number;
  unidadeNome: string;
  ativo: boolean;
  trocarSenha: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

export interface MatrizPermissoes {
  unidadeId: number;
  permissoes: { codigo: string; modulo: string; descricao: string }[];
  cargos: { cargo: Cargo; editavel: boolean; permissoes: string[]; ajustadas: string[] }[];
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
}

export interface ArquivoResposta {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  categoria: string;
  criadoEm: string;
}

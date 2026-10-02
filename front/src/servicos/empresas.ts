import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type { Empresa, EmpresaCriada, RequisicaoEmpresa, RequisicaoEmpresaDocumento } from 'src/types/empresas';
import { ErroApi } from 'src/utils/erroApi';
import { mascaraTelefone } from 'src/utils/formatacao';
import { cnpjValido } from 'src/utils/validacao';

const u = (id: number, resto = '') => `/empresas/${id}${resto}`;
const dados = <T>(r: { data: T }) => r.data;

/** Campos que a consulta de CNPJ consegue preencher. */
export type DadosCnpj = Partial<Pick<RequisicaoEmpresa, 'razaoSocial' | 'nomeFantasia' | 'endereco' | 'municipio' | 'uf' | 'telefone' | 'email'>>;

interface RespostaCnpja {
  alias?: string;
  company?: { name?: string };
  address?: { street?: string; number?: string; details?: string; district?: string; zip?: string; city?: string; state?: string };
  phones?: { area: string; number: string }[];
  emails?: { address: string }[];
}

/** Converte a resposta da CNPJá para os campos do formulário (old: mapCNPJaDataToForm). */
function paraFormulario(r: RespostaCnpja): DadosCnpj {
  const e = r.address ?? {};
  const rua = e.street ? [e.street, e.number].filter(Boolean).join(', ') : '';
  const endereco = [rua, e.details, e.district, e.zip && `CEP ${e.zip}`].filter(Boolean).join(' · ');
  const telefone = r.phones?.[0] ? mascaraTelefone(`${r.phones[0].area}${r.phones[0].number}`) : '';
  return {
    razaoSocial: r.company?.name,
    nomeFantasia: r.alias,
    endereco: endereco || undefined,
    municipio: e.city,
    uf: e.state,
    telefone: telefone || undefined,
    email: r.emails?.[0]?.address,
  };
}

export const servicoEmpresas = {
  listar: () => api.get<Empresa[]>('/empresas').then(dados),
  detalhe: (id: number) => api.get<Empresa>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),

  criar: (e: RequisicaoEmpresa) => api.post<EmpresaCriada>('/empresas', e).then(dados),
  atualizar: (id: number, e: RequisicaoEmpresa) => api.put<Empresa>(u(id), e).then(dados),
  excluir: (id: number) => api.delete(u(id)),

  adicionarDocumento: (id: number, d: RequisicaoEmpresaDocumento) =>
    api.post<Empresa>(u(id, '/documentos'), { ...d, dataValidade: d.dataValidade || null }).then(dados),
  excluirDocumento: (id: number, documentoId: number) => api.delete<Empresa>(u(id, `/documentos/${documentoId}`)).then(dados),

  /**
   * "Buscar dados" na API pública da CNPJá, direto do navegador como no antigo
   * (fetch puro: o token do sistema não pode ir para um serviço de fora).
   */
  consultarCnpj: async (cnpj: string): Promise<DadosCnpj> => {
    if (!cnpjValido(cnpj)) throw new ErroApi(400, 'CNPJ inválido. Confira os números.');
    let resposta: Response;
    try {
      resposta = await fetch(`https://open.cnpja.com/office/${cnpj.replace(/\D/g, '')}`);
    } catch {
      throw new ErroApi(0, 'Erro de conexão. Verifique sua internet.');
    }
    if (resposta.status === 404) throw new ErroApi(404, 'CNPJ não encontrado na base de dados.');
    if (resposta.status === 429) throw new ErroApi(429, 'Muitas consultas seguidas. Espere 1 minuto e tente de novo.');
    if (!resposta.ok) throw new ErroApi(resposta.status, `Erro ao consultar o CNPJ (status ${resposta.status}).`);
    return paraFormulario(await resposta.json());
  },
};

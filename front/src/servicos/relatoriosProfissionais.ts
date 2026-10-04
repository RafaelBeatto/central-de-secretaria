import api from 'src/utils/axios';
import type {
  FiltrosCentral,
  ProfissionalCentral,
  RelatorioProfissional,
  RequisicaoCobrancaRelatorio,
  RequisicaoEntregaRelatorio,
  RequisicaoRelatorioProfissional,
} from 'src/types/relatoriosProfissionais';

const BASE = '/relatorios-profissionais';
const dados = <T>(r: { data: T }) => r.data;
const ouNulo = (valor: string) => valor || null;
/** Tipo Geral não tem aluno; datas e textos vazios vão como null. */
const envio = (r: RequisicaoRelatorioProfissional) => ({
  ...r,
  nomeAluno: r.tipo === 'PESSOAL' ? ouNulo(r.nomeAluno) : null,
  complemento: ouNulo(r.complemento),
  periodoInicio: ouNulo(r.periodoInicio),
  periodoFim: ouNulo(r.periodoFim),
});

/** Só manda o que está preenchido (o back trata ausente como "todos"). */
const parametros = (f: Partial<FiltrosCentral>) =>
  Object.fromEntries(Object.entries(f).filter(([, valor]) => valor !== '' && valor != null));

export const servicoRelatoriosProfissionais = {
  meus: () => api.get<RelatorioProfissional[]>(`${BASE}/meus`).then(dados),
  enviar: (r: RequisicaoRelatorioProfissional) => api.post<RelatorioProfissional>(BASE, envio(r)).then(dados),
  /** Atende a uma cobrança (relatório Pendente). */
  entregar: (id: number, r: RequisicaoEntregaRelatorio) =>
    api
      .post<RelatorioProfissional>(`${BASE}/${id}/entregar`, { ...r, periodoInicio: ouNulo(r.periodoInicio), periodoFim: ouNulo(r.periodoFim) })
      .then(dados),
  /** Central: cobra um relatório de um professor/profissional. */
  cobrar: (usuarioId: number, r: RequisicaoCobrancaRelatorio) =>
    api
      .post<RelatorioProfissional>(`${BASE}/central/profissionais/${usuarioId}/cobrar`, {
        ...r,
        nomeAluno: r.tipo === 'PESSOAL' ? ouNulo(r.nomeAluno) : null,
        complemento: ouNulo(r.complemento),
      })
      .then(dados),

  profissionais: (filtros: FiltrosCentral) =>
    api.get<ProfissionalCentral[]>(`${BASE}/central/profissionais`, { params: parametros(filtros) }).then(dados),
  /** O nome já foi escolhido ao selecionar o profissional: a busca por nome não vai nesta consulta. */
  doProfissional: (usuarioId: number, filtros: FiltrosCentral) =>
    api
      .get<RelatorioProfissional[]>(`${BASE}/central/profissionais/${usuarioId}`, { params: parametros({ ...filtros, busca: '' }) })
      .then(dados),

  url: (id: number) => api.get<{ url: string }>(`${BASE}/${id}/url`).then((r) => r.data.url),

  /** Abre o PDF numa nova aba com um link temporário. */
  abrir: async (id: number) => {
    window.open(await servicoRelatoriosProfissionais.url(id), '_blank', 'noopener');
  },

  /** Baixa o PDF (se o armazenamento servir de outro domínio, o navegador abre o leitor, que também baixa). */
  baixar: async (id: number, nome: string | null) => {
    const link = document.createElement('a');
    link.href = await servicoRelatoriosProfissionais.url(id);
    link.download = nome ?? 'relatorio.pdf';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

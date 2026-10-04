import api from 'src/utils/axios';
import type { ArquivoResposta } from 'src/types/acesso';
import { LIMITES } from 'src/constantes/limites';
import { ErroApi } from 'src/utils/erroApi';

/** Categorias aceitas pelo back (CategoriaArquivo.java). */
export type CategoriaArquivo =
  | 'LOGO'
  | 'DOCUMENTO'
  | 'DOCUMENTO_EMPRESA'
  | 'DOCUMENTO_RECURSO'
  | 'PLANO_APLICACAO'
  | 'COTACAO'
  | 'ORDEM_COMPRA'
  | 'DOCUMENTO_EXECUCAO'
  | 'COMPROVANTE_PAGAMENTO'
  | 'ANEXO_GERADOR'
  | 'RELATORIO_PROFISSIONAL';

/** Extensões aceitas por categoria (o back valida de novo). */
export const ACEITA: Record<'imagem' | 'comprovante' | 'documento' | 'pdf', string> = {
  pdf: '.pdf',
  imagem: '.png,.jpg,.jpeg,.webp',
  comprovante: '.pdf,.png,.jpg,.jpeg,.webp',
  documento: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx',
};

export const servicoArquivos = {
  /** Envia para a AWS S3 (via back) e devolve o id para ligar ao registro. */
  enviar: (arquivo: File, categoria: CategoriaArquivo) => {
    if (arquivo.size > LIMITES.ARQUIVO_TAMANHO_MB * 1024 * 1024) {
      return Promise.reject(new ErroApi(413, `O arquivo passa de ${LIMITES.ARQUIVO_TAMANHO_MB} MB.`));
    }
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    formulario.append('categoria', categoria);
    return api.post<ArquivoResposta>('/arquivos', formulario).then((r) => r.data);
  },

  /** Abre o arquivo numa nova aba com um link temporário. */
  abrir: async (id: number) => {
    const { url } = (await api.get<{ url: string }>(`/arquivos/${id}/url`)).data;
    window.open(url, '_blank', 'noopener');
  },

  url: (id: number) => api.get<{ url: string }>(`/arquivos/${id}/url`).then((r) => r.data.url),

  /** Nome, tipo e tamanho (sem baixar o arquivo). */
  dados: (id: number) => api.get<ArquivoResposta>(`/arquivos/${id}`).then((r) => r.data),
};

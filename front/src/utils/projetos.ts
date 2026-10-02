import type { Empresa } from 'src/types/empresas';
import type { Cotacao, StatusExecucao, StatusRecurso } from 'src/types/projetos';
import { hojeIso } from './datas';
import { formatarData } from './formatacao';

const real = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Props do campo de valor em reais (CampoFormik numérico com centavos). */
export const PROPS_VALOR = { type: 'number', inputProps: { min: 0, step: '0.01', inputMode: 'decimal' } } as const;

/** R$ 1.234,56 */
export const formatarMoeda = (valor: number | null | undefined) => real.format(Number(valor) || 0);

type Tom = 'default' | 'primary' | 'success' | 'warning' | 'error';
/** Cor da situação (old: projetoStatusTom). */
export const TOM_STATUS: Record<StatusRecurso | StatusExecucao, Tom> = {
  AGUARDANDO_EXECUCAO: 'default',
  EM_EXECUCAO: 'primary',
  PARCIALMENTE_DISTRIBUIDO: 'primary',
  COM_PENDENCIAS: 'warning',
  ENCERRADO: 'success',
  PLANEJAMENTO: 'default',
  CONCLUIDO: 'success',
  SUSPENSO: 'warning',
  CANCELADO: 'error',
};

/** Quantas empresas diferentes já têm cotação (a ordem de compra pede 3). */
export const empresasCotadas = (cotacoes: Cotacao[]) => new Set(cotacoes.map((c) => c.empresaId)).size;

/**
 * Aviso de documentos da empresa vencidos numa data (a da ordem ou do pagamento), ou sem nenhum
 * documento na ficha (old: avisoDocumentosEmpresa). Vazio = tudo em dia.
 */
export function avisoDocumentosEmpresa(empresa: Empresa | undefined, data: string) {
  if (!empresa) return '';
  if (!empresa.documentos.length) return `${empresa.razaoSocial} não tem nenhuma certidão cadastrada na ficha.`;
  const dia = data || hojeIso();
  const vencidos = empresa.documentos
    .filter((d) => d.dataValidade && d.dataValidade < dia)
    .map((d) => `${d.nome} (venceu em ${formatarData(d.dataValidade)})`);
  return vencidos.length ? `Documento vencido — ${empresa.razaoSocial}: ${vencidos.join(', ')}.` : '';
}

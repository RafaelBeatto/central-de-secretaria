import type { Documento } from 'src/types/documentos';
import type { Empresa } from 'src/types/empresas';
import { diasAte, hojeIso, somarDias } from './datas';
import { formatarData } from './formatacao';

/**
 * Situação pela validade, igual ao antigo (old/js/01-core.js: situacaoDocumento).
 * Reaproveitada pelos documentos da instituição e pelos da ficha da empresa.
 */
export type ChaveSituacao = 'vencido' | 'vencendo' | 'valido' | 'sem_validade';
export type TomSituacao = 'error' | 'warning' | 'success' | 'default';

export const ROTULO_SITUACAO: Record<ChaveSituacao, string> = {
  vencido: 'Vencido',
  vencendo: 'Vencendo',
  valido: 'Válido',
  sem_validade: 'Sem validade',
};
export const TOM_SITUACAO: Record<ChaveSituacao, TomSituacao> = {
  vencido: 'error',
  vencendo: 'warning',
  valido: 'success',
  sem_validade: 'default',
};

export function situacaoValidade(dataValidade: string | null): ChaveSituacao {
  if (!dataValidade) return 'sem_validade';
  const dias = diasAte(dataValidade);
  return dias < 0 ? 'vencido' : dias <= 30 ? 'vencendo' : 'valido';
}

export const precisaRenovar = (d: Pick<Documento, 'dataValidade'>) => {
  const s = situacaoValidade(d.dataValidade);
  return s === 'vencido' || s === 'vencendo';
};

/** "Venceu há 3 dias", "Vence hoje", "Vence em 12 dias", "Válido até 31/12/2026". */
export function prazoTexto(dataValidade: string | null) {
  if (!dataValidade) return 'Sem validade';
  const dias = diasAte(dataValidade);
  if (dias < 0) return `Venceu há ${-dias} dia${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'Vence hoje';
  if (dias <= 30) return `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
  return `Válido até ${formatarData(dataValidade)}`;
}

/** Grupos da lista, na ordem do que exige ação primeiro. */
export const GRUPOS_DOCUMENTO: [ChaveSituacao, string][] = [
  ['vencido', 'Vencidos'],
  ['vencendo', 'Vencem em até 30 dias'],
  ['valido', 'Em dia'],
  ['sem_validade', 'Sem validade'],
];

/** Sem validade em ordem alfabética; os demais pela validade mais próxima. */
export function ordenarDocumentos(grupo: ChaveSituacao) {
  return (a: Documento, b: Documento) =>
    grupo === 'sem_validade'
      ? a.nome.localeCompare(b.nome, 'pt-BR')
      : String(a.dataValidade).localeCompare(String(b.dataValidade));
}

/** Atalhos de validade a partir da emissão (old: DC_VALIDADES_RAPIDAS). */
export const VALIDADES_RAPIDAS: [string, number][] = [
  ['30 dias', 30],
  ['90 dias', 90],
  ['6 meses', 180],
  ['1 ano', 365],
];
export const validadeRapida = (emissao: string, dias: number) => somarDias(emissao || hojeIso(), dias);

/**
 * Situação da documentação da empresa (old/js/04-projetos.js: statusDocumentacaoEmpresa).
 * O antigo também marcava "incompleta" documento sem arquivo; aqui o arquivo é obrigatório.
 */
export type SituacaoEmpresa = { rotulo: string; tom: 'success' | 'warning' | 'error' };

export function situacaoEmpresa(e: Pick<Empresa, 'documentos'>): SituacaoEmpresa {
  if (!e.documentos.length) return { rotulo: 'Documentação incompleta', tom: 'warning' };
  if (e.documentos.some((d) => situacaoValidade(d.dataValidade) === 'vencido')) return { rotulo: 'Documento vencido', tom: 'error' };
  return { rotulo: 'Documentação OK', tom: 'success' };
}

import type { RelatorioProfissional, StatusRelatorio } from 'src/types/relatoriosProfissionais';
import { MESES } from 'src/utils/datas';
import { LIMITES } from 'src/constantes/limites';
import { formatarData } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

/** Regras de nome, tipo, aluno (só no pessoal) e complemento — iguais no envio e na cobrança. */
export const esquemaDescricaoRelatorio = {
  nome: regras.obrigatorio(LIMITES.RELATORIO_PROF_TITULO),
  tipo: Yup.string().required(),
  nomeAluno: Yup.string()
    .trim()
    .max(LIMITES.RELATORIO_PROF_ALUNO)
    .when('tipo', { is: 'PESSOAL', then: (s) => s.required('Informe o nome do aluno') }),
  complemento: regras.texto(LIMITES.RELATORIO_PROF_COMPLEMENTO),
};

export const TOM_STATUS_RELATORIO: Record<StatusRelatorio, 'success' | 'warning'> = {
  ENTREGUE: 'success',
  PENDENTE: 'warning',
};

export const periodoTexto = (r: Pick<RelatorioProfissional, 'periodoInicio' | 'periodoFim'>) =>
  r.periodoInicio === r.periodoFim
    ? formatarData(r.periodoInicio)
    : `${formatarData(r.periodoInicio)} a ${formatarData(r.periodoFim)}`;

export const tamanhoTexto = (bytes: number | null) => {
  if (bytes == null) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export interface GrupoMes {
  mes: number;
  nome: string;
  relatorios: RelatorioProfissional[];
}
export interface GrupoAno {
  ano: number;
  meses: GrupoMes[];
}

/** Ano → mês (pelo início do período), do mais recente para o mais antigo. */
export function agruparPorAnoMes(relatorios: RelatorioProfissional[]): GrupoAno[] {
  const anos = new Map<number, Map<number, RelatorioProfissional[]>>();
  [...relatorios]
    .sort((a, b) => b.periodoInicio.localeCompare(a.periodoInicio) || (b.enviadoEm ?? '').localeCompare(a.enviadoEm ?? ''))
    .forEach((r) => {
      const ano = Number(r.periodoInicio.slice(0, 4));
      const mes = Number(r.periodoInicio.slice(5, 7));
      const porMes = anos.get(ano) ?? new Map<number, RelatorioProfissional[]>();
      porMes.set(mes, [...(porMes.get(mes) ?? []), r]);
      anos.set(ano, porMes);
    });
  return [...anos.entries()].map(([ano, porMes]) => ({
    ano,
    meses: [...porMes.entries()].map(([mes, lista]) => ({
      mes,
      nome: MESES[mes - 1].charAt(0).toUpperCase() + MESES[mes - 1].slice(1),
      relatorios: lista,
    })),
  }));
}

/** Anos para o filtro: do atual para trás. */
export const anosParaFiltro = (quantidade = 6) => {
  const atual = new Date().getFullYear();
  return Array.from({ length: quantidade }, (_, i) => atual - i);
};

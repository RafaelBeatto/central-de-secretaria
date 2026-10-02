import { PESO_PRIORIDADE } from 'src/types/comum';
import type { Tarefa } from 'src/types/tarefas';
import { diasAte, diaSemanaCurto } from './datas';
import { formatarData } from './formatacao';

/**
 * Regras de exibição das tarefas (as mesmas de old/js/05a-secretaria.js),
 * usadas pela Secretaria, pelo Kanban e depois por Agenda, Pendências e Painel.
 */
export type GrupoTarefa = 'atrasadas' | 'hoje' | 'semana' | 'depois' | 'semprazo' | 'concluidas';

export const GRUPOS_TAREFA: [GrupoTarefa, string][] = [
  ['atrasadas', 'Atrasadas'],
  ['hoje', 'Hoje'],
  ['semana', 'Próximos 7 dias'],
  ['depois', 'Mais adiante'],
  ['semprazo', 'Sem prazo'],
  ['concluidas', 'Concluídas e canceladas'],
];

export const encerrada = (t: Tarefa) => t.status === 'CANCELADA' || (!t.recorrente && t.status === 'CONCLUIDA');

export function grupoDaTarefa(t: Tarefa): GrupoTarefa {
  if (t.feitaHoje) return 'hoje';
  if (encerrada(t)) return 'concluidas';
  if (!t.prazoEfetivo) return 'semprazo';
  const dias = diasAte(t.prazoEfetivo);
  return dias < 0 ? 'atrasadas' : dias === 0 ? 'hoje' : dias <= 7 ? 'semana' : 'depois';
}

export function atrasada(t: Tarefa) {
  return !!t.prazoEfetivo && !encerrada(t) && !t.feitaHoje && diasAte(t.prazoEfetivo) < 0;
}

/** Rotina cuja próxima vez ainda não chegou: não pode ser marcada agora. */
export const rotinaFutura = (t: Tarefa) =>
  t.recorrente && !t.feitaHoje && !!t.prazoEfetivo && diasAte(t.prazoEfetivo) > 0;

/** Tom e texto do prazo (selo no detalhe e cartão do Kanban). */
export function situacaoPrazo(t: Tarefa): { tom: 'error' | 'warning' | 'success' | 'default'; texto: string } {
  const data = t.prazoEfetivo;
  if (t.recorrente) {
    if (!data) return { tom: 'default', texto: 'Sem prazo' };
    const d = diasAte(data);
    if (t.feitaHoje || d > 0) return { tom: 'success', texto: `Feita · volta em ${formatarData(data)}` };
    return { tom: 'error', texto: d < 0 ? `Atrasada · ${formatarData(data)}` : 'Hoje' };
  }
  if (t.status === 'CONCLUIDA') {
    return { tom: 'success', texto: t.dataConclusao ? `Concluída em ${formatarData(t.dataConclusao)}` : 'Concluída' };
  }
  if (!data) return { tom: 'default', texto: 'Sem prazo' };
  const d = diasAte(data);
  if (d < 0 && t.status !== 'CANCELADA') return { tom: 'error', texto: `Atrasada · ${formatarData(data)}` };
  if (d === 0) return { tom: 'error', texto: 'Hoje' };
  if (d <= 3) return { tom: 'warning', texto: `${d} dia${d === 1 ? '' : 's'} · ${formatarData(data)}` };
  return { tom: 'default', texto: formatarData(data) };
}

/** "Ontem", "Há 3 dias", "Amanhã · 14:00", "seg, 12/05"… (coluna à direita da lista). */
export function quando(t: Tarefa, grupo: GrupoTarefa) {
  const hora = t.horario?.slice(0, 5) ?? '';
  if (grupo === 'concluidas') {
    return t.status === 'CANCELADA' ? 'Cancelada' : t.dataConclusao ? formatarData(t.dataConclusao) : 'Concluída';
  }
  const data = t.prazoEfetivo;
  if (!data) return '';
  const d = diasAte(data);
  if (grupo === 'hoje') return t.feitaHoje ? 'Feita' : hora;
  if (d < 0) return d === -1 ? 'Ontem' : `Há ${-d} dias`;
  if (d === 1) return `Amanhã${hora ? ` · ${hora}` : ''}`;
  const dataCurta = formatarData(data).slice(0, 5) + (d > 300 ? `/${data.slice(0, 4)}` : '');
  return d <= 7 ? `${diaSemanaCurto(data)}, ${dataCurta}` : dataCurta;
}

/** Feitas por último, depois prazo, horário, prioridade e título. */
export function ordenarTarefas(a: Tarefa, b: Tarefa) {
  if (a.feitaHoje !== b.feitaHoje) return a.feitaHoje ? 1 : -1;
  const pa = a.prazoEfetivo ?? '9999';
  const pb = b.prazoEfetivo ?? '9999';
  if (pa !== pb) return pa < pb ? -1 : 1;
  const ha = a.horario ?? '99';
  const hb = b.horario ?? '99';
  if (ha !== hb) return ha < hb ? -1 : 1;
  return PESO_PRIORIDADE[b.prioridade] - PESO_PRIORIDADE[a.prioridade] || a.titulo.localeCompare(b.titulo, 'pt-BR');
}

export const progressoSubtarefas = (t: Tarefa) => {
  const total = t.subtarefas.length;
  const feitas = t.subtarefas.filter((s) => s.feita).length;
  return { total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
};

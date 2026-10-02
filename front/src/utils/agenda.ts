import type { GrupoOrigem, ItemAgenda, ModoAgenda } from 'src/types/agenda';
import { diasEntre, doIso, hojeIso, inicioDaSemana, MESES, mesPorExtenso, somarDias, somarMeses } from './datas';
import { formatarData } from './formatacao';
import { normalizar } from './formatacao';

/**
 * Regras de exibição da Agenda (as mesmas de old/js/05-agenda.js),
 * reaproveitáveis pelo Painel e pelas Pendências.
 */
export const DIAS_DA_LISTA = 30;

export const grupoOrigem = (i: ItemAgenda): GrupoOrigem =>
  i.origem === 'DOCUMENTO' || i.origem === 'PROJETO' ? 'PRAZO' : i.origem;

/** Só eventos e tarefas mudam de data arrastando; prazos vêm de outro módulo. */
export const arrastavel = (i: ItemAgenda) => i.origem === 'EVENTO' || i.origem === 'TAREFA';

export const hora = (valor: string | null) => valor?.slice(0, 5) ?? '';

/** "09:00–10:30", "09:00" ou "" (dia todo). */
export const horario = (i: { horarioInicio: string | null; horarioFim: string | null }) =>
  i.horarioInicio ? hora(i.horarioInicio) + (i.horarioFim ? `–${hora(i.horarioFim)}` : '') : '';

/** Marca antes do título: ☐/☑ tarefa, 📄 documento, 📁 projeto. */
export function marcaOrigem(i: ItemAgenda) {
  if (i.origem === 'TAREFA') return i.concluido ? '☑' : '☐';
  if (i.origem === 'DOCUMENTO') return '📄';
  if (i.origem === 'PROJETO') return '📁';
  return '';
}

/** Primeiro e último dia que a visão mostra (a Mês completa as semanas das pontas). */
export function periodo(modo: ModoAgenda, ref: string) {
  if (modo === 'semana') {
    const inicio = inicioDaSemana(ref);
    return { inicio, fim: somarDias(inicio, 6) };
  }
  if (modo === 'lista') return { inicio: ref, fim: somarDias(ref, DIAS_DA_LISTA - 1) };
  const primeiro = somarMeses(ref, 0);
  const ultimo = somarDias(somarMeses(ref, 1), -1);
  const inicio = inicioDaSemana(primeiro);
  return { inicio, fim: somarDias(inicioDaSemana(ultimo), 6) };
}

/** "6 a 12 de outubro de 2026", "28 de set a 4 de out de 2026", "Outubro de 2026", "Próximos 30 dias". */
export function tituloPeriodo(modo: ModoAgenda, ref: string) {
  if (modo === 'mes') return mesPorExtenso(ref);
  if (modo === 'lista') return ref === hojeIso() ? `Próximos ${DIAS_DA_LISTA} dias` : `${DIAS_DA_LISTA} dias a partir de ${formatarData(ref)}`;
  const { inicio, fim } = periodo('semana', ref);
  const a = doIso(inicio);
  const b = doIso(fim);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`
    : `${a.getDate()} de ${MESES[a.getMonth()].slice(0, 3)} a ${b.getDate()} de ${MESES[b.getMonth()].slice(0, 3)} de ${b.getFullYear()}`;
}

/** Nova data de referência ao apertar ‹ ou ›. */
export function mudarPeriodo(modo: ModoAgenda, ref: string, passo: number) {
  if (modo === 'mes') return somarMeses(ref, passo);
  return somarDias(ref, passo * (modo === 'lista' ? DIAS_DA_LISTA : 7));
}

/** Busca do antigo: título, responsável, local, tipo, participantes e descrição. */
export function combinaBusca(i: ItemAgenda, busca: string, rotuloTipo: string) {
  const q = normalizar(busca.trim());
  return !q || normalizar([i.titulo, i.responsavel, i.local, rotuloTipo, i.participantes, i.descricao].join(' ')).includes(q);
}

/** Itens agrupados por dia (o back já manda em ordem de data, horário e título). */
export function porDia(itens: ItemAgenda[]) {
  const mapa: Record<string, ItemAgenda[]> = {};
  itens.forEach((i) => {
    (mapa[i.data] ??= []).push(i);
  });
  return mapa;
}

/** Padrão do "repetir até": 31/12 do ano, ou um ano depois se faltarem 30 dias ou menos. */
export function fimPadraoRepeticao(data: string) {
  const fimDoAno = `${data.slice(0, 4)}-12-31`;
  return diasEntre(data, fimDoAno) > 30 ? fimDoAno : somarDias(data, 365);
}


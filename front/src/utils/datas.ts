/**
 * Datas "de calendário" (AAAA-MM-DD, sem fuso) no horário local do navegador,
 * como o sistema antigo fazia. Reaproveitado por Secretaria, Kanban, Agenda e Atendimentos.
 */
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const doIso = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const paraIso = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

export const hojeIso = () => paraIso(new Date());

export function somarDias(iso: string, dias: number) {
  const data = doIso(iso);
  data.setDate(data.getDate() + dias);
  return paraIso(data);
}

/** Dias de hoje até a data (negativo = passou). */
export function diasAte(iso: string) {
  const hoje = doIso(hojeIso());
  return Math.round((doIso(iso).getTime() - hoje.getTime()) / 86400000);
}

export const diaSemanaCurto = (iso: string) => DIAS_CURTOS[doIso(iso).getDay()];
export const diaSemanaLongo = (iso: string) => DIAS[doIso(iso).getDay()];
export const NOMES_DIAS = DIAS;

/** "29 de setembro" (+ " de 2027" se não for o ano atual). */
export function dataPorExtenso(iso: string) {
  const d = doIso(iso);
  const ano = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : '';
  return `${d.getDate()} de ${MESES[d.getMonth()]}${ano}`;
}

/** Segunda-feira da semana da data (a agenda começa a semana na segunda). */
export function inicioDaSemana(iso: string) {
  const d = doIso(iso);
  return somarDias(iso, -((d.getDay() + 6) % 7));
}

/** Dias entre duas datas (b − a). */
export const diasEntre = (a: string, b: string) => Math.round((doIso(b).getTime() - doIso(a).getTime()) / 86400000);

/** Primeiro dia do mês seguinte/anterior (n meses a partir da data). */
export function somarMeses(iso: string, meses: number) {
  const d = doIso(iso);
  return paraIso(new Date(d.getFullYear(), d.getMonth() + meses, 1));
}

/** "Outubro de 2026". */
export function mesPorExtenso(iso: string) {
  const d = doIso(iso);
  const mes = MESES[d.getMonth()];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${d.getFullYear()}`;
}

/** "Segunda-feira, 29 de setembro". */
export const dataCompleta = (iso: string) => `${diaSemanaLongo(iso)}, ${dataPorExtenso(iso)}`;

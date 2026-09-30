/** Formatações de exibição em pt-BR (datas, iniciais, máscaras). */

const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "2026-09-29" (data sem fuso) → "29/09/2026". */
export function formatarData(iso?: string | null) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '—';
}

/** Instante (com fuso) → "29/09/2026 14:30". */
export const formatarDataHora = (iso?: string | null) => (iso ? dataHora.format(new Date(iso)) : '—');

/** Hora se for hoje, senão a data: usado nas listas de conversa. */
export function formatarMomento(iso?: string | null) {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toDateString() === new Date().toDateString() ? hora.format(data) : dataCurta.format(data);
}

export const formatarHora = (iso: string) => hora.format(new Date(iso));

/** "Maria Presidente" → "MP" (avatar sem foto). */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** 00.000.000/0000-00 enquanto digita. */
export function mascaraCnpj(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** 000.000.000-00 enquanto digita. */
export function mascaraCpf(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** (00) 00000-0000 enquanto digita. */
export function mascaraTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export const ROTULO_TIPO_UNIDADE = { NACIONAL: 'Nacional', ESTADUAL: 'Estadual', MUNICIPAL: 'Municipal' } as const;

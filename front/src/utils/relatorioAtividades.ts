import type { UnidadeDetalhe } from 'src/types/acesso';
import { ROTULO_TIPO_EVENTO } from 'src/types/agenda';
import type { RelatorioAtividades } from 'src/types/relatorios';
import { hojeIso, paraIso, doIso, somarDias } from './datas';
import { cabecalhoInstitucionalHtml, escapeHtml, paginaA4 } from './documentoA4';
import { formatarData } from './formatacao';
import { formatarMoeda } from './projetos';

export type PeriodoRelatorio = 'mes' | 'mesAnterior' | '7dias' | 'ano' | 'custom';

export const PERIODOS_RELATORIO: [PeriodoRelatorio, string][] = [
  ['mes', 'Este mês'],
  ['mesAnterior', 'Mês passado'],
  ['7dias', 'Últimos 7 dias'],
  ['ano', 'Este ano'],
  ['custom', 'Escolher…'],
];

/** Intervalo [de, ate] do período escolhido (old: rlIntervalo). */
export function intervaloDoPeriodo(periodo: PeriodoRelatorio, de: string, ate: string): [string, string] {
  const hoje = hojeIso();
  const d = doIso(hoje);
  switch (periodo) {
    case 'mes':
      return [paraIso(new Date(d.getFullYear(), d.getMonth(), 1)), hoje];
    case 'mesAnterior':
      return [paraIso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), paraIso(new Date(d.getFullYear(), d.getMonth(), 0))];
    case '7dias':
      return [somarDias(hoje, -6), hoje];
    case 'ano':
      return [`${hoje.slice(0, 4)}-01-01`, hoje];
    default:
      return [de || `${hoje.slice(0, 8)}01`, ate || hoje];
  }
}

/** Mesmo estilo do antigo: vale igual na prévia, na impressão e no PDF. */
const ESTILO = `
  .rl-doc{font-family:'Times New Roman',Georgia,serif;color:#000;font-size:11pt;line-height:1.45}
  .rl-doc h2,.rl-doc h3,.rl-doc p,.rl-doc td,.rl-doc th{font-family:inherit;color:#000}
  .rl-doc h2{font-size:12.5pt;margin:22px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #000;text-transform:uppercase;letter-spacing:.3px}
  .rl-doc h3{font-size:11pt;margin:14px 0 6px}
  .rl-doc .rl-sub{text-align:center;margin:-14px 0 18px;font-size:10.5pt}
  .rl-doc table{width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:10pt}
  .rl-doc th,.rl-doc td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
  .rl-doc th{background:#f0f0f0;font-weight:bold}
  .rl-doc td.n,.rl-doc th.n{text-align:right;white-space:nowrap}
  .rl-doc .rl-resumo{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #999;margin:6px 0 4px}
  .rl-doc .rl-resumo div{padding:6px 8px;border:1px solid #ddd}
  .rl-doc .rl-resumo b{display:block;font-size:14pt}
  .rl-doc .rl-resumo span{font-size:9.5pt}
  .rl-doc .rl-nada{font-style:italic;color:#555;margin:4px 0}
  .rl-doc .rl-nota{font-size:9.5pt;color:#444;margin:4px 0}
  .rl-doc tr,.rl-doc .rl-resumo{break-inside:avoid}
`;

const e = (t: string | null | undefined) => escapeHtml(t ?? '');
const data = (iso: string | null | undefined) => (iso ? formatarData(iso) : '—');
const nada = (t: string) => `<p class="rl-nada">${t}</p>`;

function tabela(cab: string[], linhas: string[][], numericas: number[] = []) {
  const n = (i: number) => (numericas.includes(i) ? ' class="n"' : '');
  return `<table><thead><tr>${cab.map((c, i) => `<th${n(i)}>${c}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${l.map((c, i) => `<td${n(i)}>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

/** Monta o relatório A4 (cabeçalho da unidade + as seções vindas do back). */
export function montarHtmlRelatorio(r: RelatorioAtividades, unidade: UnidadeDetalhe | undefined, logoUrl: string | null) {
  const S = r.secretaria;
  const A = r.agenda;
  const T = r.atendimentos;
  const D = r.documentos;
  const P = r.projetos;
  const resumo: [string | number, string][] = [];
  if (S) resumo.push([S.concluidas.length, 'tarefas concluídas']);
  if (A) resumo.push([A.compromissos.length, 'compromissos na agenda']);
  if (T) resumo.push([T.total, 'atendimentos'], [T.taxa === null ? '—' : `${T.taxa}%`, 'de presença nos atendimentos']);
  if (D) resumo.push([D.renovados.length, 'documentos renovados']);
  if (P) resumo.push([formatarMoeda(P.totalPago), 'pagos nos projetos']);

  const partes: string[] = [];
  if (S) {
    partes.push(`<h2>Secretaria</h2>
      <p>${S.criadas} tarefa(s) registrada(s) no período · ${S.concluidas.length} concluída(s) · ${S.abertas} em aberto hoje${S.atrasadas.length ? `, das quais ${S.atrasadas.length} atrasada(s)` : ''}.</p>
      <h3>Tarefas concluídas</h3>
      ${S.concluidas.length ? tabela(['Data', 'Tarefa', 'Responsável'], S.concluidas.map((c) => [data(c.dia), e(c.titulo), e(c.responsavel) || '—'])) : nada('Nenhuma tarefa concluída no período.')}
      ${S.atrasadas.length ? `<h3>Atrasadas hoje</h3>${tabela(['Prazo', 'Tarefa', 'Responsável'], S.atrasadas.map((c) => [data(c.prazo), e(c.titulo), e(c.responsavel) || '—']))}` : ''}`);
  }
  if (A) {
    partes.push(`<h2>Agenda</h2>${
      A.compromissos.length
        ? `<p>${A.compromissos.length} compromisso(s) no período, ${A.realizados} marcado(s) como realizado(s).</p>${tabela(
            ['Data', 'Hora', 'Compromisso', 'Local', 'Realizado'],
            A.compromissos.map((c) => [data(c.data), c.horario?.slice(0, 5) ?? '—', e(`${c.titulo} (${ROTULO_TIPO_EVENTO[c.tipo] ?? c.tipo})`), e(c.local) || '—', c.realizado ? 'Sim' : '—']),
          )}`
        : nada('Nenhum compromisso no período.')
    }`);
  }
  if (T) {
    partes.push(`<h2>Atendimentos</h2>${
      T.total
        ? `<p>${T.total} atendimento(s) de ${T.alunos} aluno(s): ${T.veio} com presença, ${T.faltou} falta(s)${T.semRegistro ? `, ${T.semRegistro} sem registro` : ''}. Presença de ${T.taxa === null ? '—' : `${T.taxa}%`} (vieram ÷ vieram + faltaram).</p>${tabela(
            ['Profissional', 'Alunos', 'Atendimentos', 'Vieram', 'Faltaram'],
            T.profissionais.map((p) => [e(p.nome), String(p.alunos), String(p.atendimentos), String(p.veio), String(p.faltou)]),
            [1, 2, 3, 4],
          )}${T.motivos.length ? `<p class="rl-nota">Motivos das faltas: ${T.motivos.map((m) => `${e(m.rotulo)} (${m.quantidade})`).join('; ')}.</p>` : ''}`
        : nada('Nenhum atendimento no período.')
    }`);
  }
  if (D) {
    partes.push(`<h2>Documentos</h2>
      <p>${D.total} documento(s) cadastrado(s) no total · ${D.cadastrados} novo(s) no período · ${D.renovados.length} renovado(s) no período.</p>
      ${D.renovados.length ? `<h3>Renovados no período</h3>${tabela(['Renovado em', 'Documento', 'Nova validade'], D.renovados.map((x) => [data(x.dia), e(x.nome), data(x.validade)]))}` : ''}
      <h3>Situação hoje</h3>
      ${D.situacao.length ? tabela(['Documento', 'Validade', 'Situação'], D.situacao.map((x) => [e(x.nome), data(x.validade), x.dias < 0 ? 'Vencido' : `Vence em ${x.dias} dia(s)`])) : nada('Nenhum documento vencido ou vencendo nos próximos 30 dias.')}`);
  }
  if (P) {
    partes.push(`<h2>Projetos</h2>
      ${P.recursos.length ? tabela(['Recurso', 'Recebido', 'Executado (total)', 'Saldo disponível'], P.recursos.map((x) => [e(x.nome), formatarMoeda(x.recebido), formatarMoeda(x.pago), formatarMoeda(x.disponivel)]), [1, 2, 3]) : ''}
      <h3>Pagamentos no período</h3>
      ${P.pagamentos.length ? tabela(['Data', 'Execução', 'Fornecedor', 'Valor'], [...P.pagamentos.map((x) => [data(x.data), e(`${x.execucao}${x.recurso ? ` — ${x.recurso}` : ''}`), e(x.fornecedor) || '—', formatarMoeda(x.valor)]), ['', '', '<b>Total</b>', `<b>${formatarMoeda(P.totalPago)}</b>`]], [3]) : nada('Nenhum pagamento registrado no período.')}`);
  }

  const agora = new Date();
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  return paginaA4(`<style>${ESTILO}</style>${cabecalhoInstitucionalHtml(unidade, logoUrl)}
    <div class="rl-doc">
      <div class="doc-a4-titulo">Relatório de atividades</div>
      <p class="rl-sub">Período: ${data(r.de)} a ${data(r.ate)} · emitido em ${formatarData(hojeIso())} às ${hora}</p>
      ${resumo.length ? `<div class="rl-resumo">${resumo.map(([v, t]) => `<div><b>${v}</b><span>${t}</span></div>`).join('')}</div>` : ''}
      ${partes.join('') || nada('Escolha ao menos uma área para o relatório.')}
    </div>
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_______________________________</div><div>Responsável</div></div>`);
}

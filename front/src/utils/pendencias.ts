import type { Documento } from 'src/types/documentos';
import type { DadosPainel } from 'src/types/painel';
import type { Tarefa } from 'src/types/tarefas';
import { ROTULO_MOTIVO_FALTA } from 'src/types/atendimentos';
import { diasAte, hojeIso } from './datas';
import { formatarData } from './formatacao';
import { encerrada, rotinaFutura } from './tarefas';
import { situacaoValidade, prazoTexto } from './documentos';

/**
 * Pendências: o que espera pelo usuário, juntado das fontes que já existem
 * (old/js/11-pendencias.js). Quatro grupos, como a Central de Ações do antigo.
 */
export type CategoriaPendencia = 'atrasado' | 'hoje' | 'atencao' | 'proximo';
export type OrigemPendencia = 'tarefas' | 'documentos' | 'atendimentos' | 'agenda' | 'projetos';

/** O que o botão da linha faz (rótulo e fluxo ficam em components/apps/pendencias). */
export type AcaoPendencia =
  | { tipo: 'tarefa'; tarefa: Tarefa }
  | { tipo: 'documento'; documento: Documento }
  | { tipo: 'atendimento'; id: number }
  | { tipo: 'evento'; id: number }
  | { tipo: 'faltas'; alunoId: number }
  | { tipo: 'pendenciaProjeto'; execucaoId: number; id: number }
  | null;

export interface Pendencia {
  id: string;
  categoria: CategoriaPendencia;
  origem: OrigemPendencia;
  rotulo: string;
  titulo: string;
  descricao: string;
  data: string | null;
  /** Rota ao clicar na linha. */
  abrir: string;
  acao: AcaoPendencia;
}

export const SECOES_PENDENCIA: { categoria: CategoriaPendencia; titulo: string; dica: string }[] = [
  { categoria: 'atrasado', titulo: 'Atrasado', dica: 'Passou do prazo — resolva primeiro.' },
  { categoria: 'hoje', titulo: 'Para hoje', dica: 'Tarefas, compromissos e atendimentos de hoje.' },
  { categoria: 'atencao', titulo: 'Precisa de atenção', dica: 'Documentos perto de vencer e etapas de projetos.' },
  { categoria: 'proximo', titulo: 'Próximos dias', dica: 'Tarefas com prazo nos próximos 3 dias.' },
];

export const ORIGENS_PENDENCIA: [OrigemPendencia, string][] = [
  ['tarefas', 'Tarefas'],
  ['documentos', 'Documentos'],
  ['atendimentos', 'Atendimentos'],
  ['agenda', 'Agenda'],
  ['projetos', 'Projetos'],
];

const plural = (n: number, singular: string, pl: string) => (n === 1 ? singular : pl);

function dasTarefas(tarefas: Tarefa[]): Pendencia[] {
  return tarefas
    .filter((t) => !encerrada(t) && !t.feitaHoje && !rotinaFutura(t) && t.prazoEfetivo && diasAte(t.prazoEfetivo) <= 3)
    .map((t): Pendencia => {
      const prazo = t.prazoEfetivo as string;
      const dias = diasAte(prazo);
      const quem = t.responsavel ? ` · ${t.responsavel}` : '';
      const descricao =
        dias < 0
          ? `${dias === -1 ? 'Venceu ontem' : `Venceu há ${-dias} dias`} (${formatarData(prazo)})${quem}`
          : dias === 0
            ? `Prazo hoje${quem}`
            : `Em ${dias} ${plural(dias, 'dia', 'dias')}${quem}`;
      return {
        id: `tarefa-${t.id}`,
        categoria: dias < 0 ? 'atrasado' : dias === 0 ? 'hoje' : 'proximo',
        origem: 'tarefas',
        rotulo: 'Tarefa',
        titulo: t.titulo,
        descricao,
        data: prazo,
        abrir: `/secretaria?tarefa=${t.id}`,
        acao: { tipo: 'tarefa', tarefa: t },
      };
    });
}

function dosDocumentos(documentos: Documento[]): Pendencia[] {
  return documentos
    .filter((d) => {
      const situacao = situacaoValidade(d.dataValidade);
      return situacao === 'vencido' || (situacao === 'vencendo' && !!d.dataValidade && diasAte(d.dataValidade) <= 7);
    })
    .map((d): Pendencia => ({
      id: `documento-${d.id}`,
      categoria: situacaoValidade(d.dataValidade) === 'vencido' ? 'atrasado' : 'atencao',
      origem: 'documentos',
      rotulo: 'Documento',
      titulo: d.nome,
      descricao: `${prazoTexto(d.dataValidade)} (${formatarData(d.dataValidade)})`,
      data: d.dataValidade,
      abrir: `/documentos?documento=${d.id}`,
      acao: { tipo: 'documento', documento: d },
    }));
}

function dosProjetos({ recursos, extras }: DadosPainel): Pendencia[] {
  const execucoes = recursos.filter((r) => !r.arquivado).flatMap((r) => r.execucoes);
  const vivas = execucoes.filter((e) => !['CONCLUIDO', 'CANCELADO', 'SUSPENSO'].includes(e.status));
  // Uma linha por execução com as etapas que faltam (como o antigo agrupava).
  const etapas = vivas.flatMap((e): Pendencia[] => {
    const faltando = e.situacao.etapas.filter((x) => !x.ok);
    if (!faltando.length) return [];
    return [
      {
        id: `execucao-${e.id}`,
        categoria: 'atencao',
        origem: 'projetos',
        rotulo: 'Projeto',
        titulo: e.nome,
        descricao: `${e.recursoNome} · Falta: ${faltando.map((x) => x.rotulo).join(', ')}`,
        data: e.dataFim,
        abrir: `/projetos?execucao=${e.id}&secao=${faltando[0].secao}`,
        acao: null,
      },
    ];
  });
  const porId = new Map(execucoes.map((e) => [e.id, e]));
  const manuais = extras.pendenciasExecucao.flatMap((p): Pendencia[] => {
    const e = porId.get(p.execucaoId);
    if (!e) return [];
    const urgencia = p.prioridade === 'ALTA' || p.prioridade === 'URGENTE' ? `prioridade ${p.prioridade.toLowerCase()}` : '';
    return [
      {
        id: `pendencia-projeto-${p.id}`,
        categoria: 'atencao',
        origem: 'projetos',
        rotulo: 'Projeto',
        titulo: p.titulo,
        descricao: [e.nome, urgencia].filter(Boolean).join(' · '),
        data: null,
        abrir: `/projetos?execucao=${p.execucaoId}&secao=pendencias`,
        acao: { tipo: 'pendenciaProjeto', execucaoId: p.execucaoId, id: p.id },
      },
    ];
  });
  return [...manuais, ...etapas];
}

export function montarPendencias(dados: DadosPainel): Pendencia[] {
  const hoje = hojeIso();
  const eventosDeHoje = dados.agenda
    .filter((i) => i.origem === 'EVENTO' && i.data === hoje && !i.concluido)
    .map((e): Pendencia => ({
      id: `evento-${e.refId}-${e.data}`,
      categoria: 'hoje',
      origem: 'agenda',
      rotulo: 'Agenda',
      titulo: e.titulo,
      descricao: [e.horarioInicio?.slice(0, 5) ?? 'sem horário', e.local].filter(Boolean).join(' · '),
      data: e.data,
      abrir: '/agenda',
      acao: { tipo: 'evento', id: e.refId },
    }));
  const atendimentos = dados.extras.atendimentosSemPresenca.map((a): Pendencia => ({
    id: `atendimento-${a.id}`,
    categoria: a.data < hoje ? 'atrasado' : 'hoje',
    origem: 'atendimentos',
    rotulo: 'Atendimento',
    titulo: `${a.alunoNome} (${a.profissionalNome})`,
    descricao: `Sem presença · ${formatarData(a.data)} às ${a.horario.slice(0, 5)}`,
    data: a.data,
    abrir: '/atendimentos',
    acao: { tipo: 'atendimento', id: a.id },
  }));
  const faltas = dados.extras.alunosComFaltas.map((f): Pendencia => ({
    id: `faltas-${f.alunoId}`,
    categoria: 'atencao',
    origem: 'atendimentos',
    rotulo: 'Faltas seguidas',
    titulo: f.alunoNome,
    descricao: `${f.quantidade} faltas seguidas desde ${formatarData(f.desde)}${f.motivos.length ? ` · ${f.motivos.map((m) => ROTULO_MOTIVO_FALTA[m]).join(', ')}` : ''}`,
    data: f.ultima,
    abrir: '/atendimentos',
    acao: { tipo: 'faltas', alunoId: f.alunoId },
  }));
  return [...dasTarefas(dados.tarefas), ...dosDocumentos(dados.documentos), ...eventosDeHoje, ...atendimentos, ...faltas, ...dosProjetos(dados)];
}

/** Mais antigo primeiro; sem data por último. */
const porData = (a: Pendencia, b: Pendencia) => (a.data ?? '9999').localeCompare(b.data ?? '9999');

export function porCategoria(lista: Pendencia[]) {
  const grupos: Record<CategoriaPendencia, Pendencia[]> = { atrasado: [], hoje: [], atencao: [], proximo: [] };
  lista.forEach((p) => grupos[p.categoria].push(p));
  Object.values(grupos).forEach((g) => g.sort(porData));
  return grupos;
}

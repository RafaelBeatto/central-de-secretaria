import type { AtendimentoResposta, FaltasSeguidas, MotivoFalta, ResumoAtendimentos } from 'src/types/atendimentos';
import { hojeIso } from './datas';

/** Só conta quem não foi remarcado: a cópia na nova data é quem representa o atendimento. */
export const efetivo = (a: AtendimentoResposta) => !a.remarcado;

export function resumo(lista: AtendimentoResposta[]): ResumoAtendimentos {
  const ef = lista.filter(efetivo);
  const veio = ef.filter((a) => a.presenca === 'VEIO').length;
  const faltou = ef.filter((a) => a.presenca === 'FALTOU').length;
  const semRegistro = ef.filter((a) => a.presenca === 'NAO_INFORMADO');
  const hoje = hojeIso();
  return {
    total: ef.length,
    veio,
    faltou,
    semRegistro: semRegistro.length,
    semRegistroPassado: semRegistro.filter((a) => a.data < hoje).length,
    taxa: veio + faltou ? Math.round((veio / (veio + faltou)) * 100) : null,
  };
}

/**
 * Sequência de faltas mais recentes de um aluno, andando do atendimento mais novo
 * para o mais velho e parando no primeiro que não for falta (old: atFaltasSeguidas).
 * "lista" já deve vir ordenada da mais nova para a mais velha (como o back devolve).
 */
export function faltasSeguidas(lista: AtendimentoResposta[]): FaltasSeguidas {
  const hoje = hojeIso();
  const decididos = lista.filter((a) => efetivo(a) && a.data <= hoje && a.presenca !== 'NAO_INFORMADO');
  const faltas: AtendimentoResposta[] = [];
  for (const a of decididos) {
    if (a.presenca !== 'FALTOU') break;
    faltas.push(a);
  }
  const motivos = [...new Set(faltas.map((a) => a.faltaMotivo).filter((m): m is MotivoFalta => !!m))];
  return {
    quantidade: faltas.length,
    ultima: faltas[0]?.data ?? null,
    desde: faltas[faltas.length - 1]?.data ?? null,
    motivos,
  };
}

export const LIMITE_FALTAS_ALERTA = 3;

/** Verdadeiro quando o aviso de faltas seguidas deve aparecer (ainda não tratado). */
export function precisaAvisarFaltas(fs: FaltasSeguidas, faltasContatoAte: string | null) {
  return fs.quantidade >= LIMITE_FALTAS_ALERTA && !(faltasContatoAte && fs.ultima && fs.ultima <= faltasContatoAte);
}

/** Atendimentos futuros e ainda sem presença, da mesma série (para "Encerrar a partir de..."). */
export function serieFutura(lista: AtendimentoResposta[], atual: AtendimentoResposta) {
  if (!atual.serieId) return [];
  return lista.filter(
    (a) => a.serieId === atual.serieId && a.data >= atual.data && a.presenca === 'NAO_INFORMADO' && efetivo(a),
  );
}

/** Agrupa por data (AAAA-MM-DD) e ordena cada dia por horário e nome do aluno. */
export function porDia(lista: AtendimentoResposta[]) {
  const mapa: Record<string, AtendimentoResposta[]> = {};
  lista.forEach((a) => {
    (mapa[a.data] ??= []).push(a);
  });
  Object.values(mapa).forEach((dia) => dia.sort((x, y) => x.horario.localeCompare(y.horario) || x.alunoNome.localeCompare(y.alunoNome, 'pt-BR')));
  return mapa;
}

export function combinaBusca(a: AtendimentoResposta, busca: string) {
  if (!busca.trim()) return true;
  const alvo = `${a.alunoNome} ${a.profissionalNome} ${a.observacao ?? ''}`.toLocaleLowerCase('pt-BR');
  return alvo.includes(busca.trim().toLocaleLowerCase('pt-BR'));
}

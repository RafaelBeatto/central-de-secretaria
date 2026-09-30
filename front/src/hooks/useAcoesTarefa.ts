import { useCallback } from 'react';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoTarefas } from 'src/servicos/tarefas';
import type { Tarefa } from 'src/types/tarefas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData } from 'src/utils/formatacao';

/**
 * Ações sobre tarefas com aviso de sucesso/erro, compartilhadas pela Secretaria,
 * pelo Kanban (e depois Agenda/Pendências). "aoAtualizar" recebe a tarefa já
 * atualizada pelo back para substituir na lista sem recarregar tudo.
 */
export function useAcoesTarefa(aoAtualizar: (t: Tarefa) => void, aoExcluir?: (id: number) => void) {
  const { notificar, confirmar } = useInteracao();

  const executar = useCallback(
    async (acao: () => Promise<Tarefa>, mensagem?: (t: Tarefa) => string) => {
      try {
        const tarefa = await acao();
        aoAtualizar(tarefa);
        if (mensagem) notificar(mensagem(tarefa));
        return tarefa;
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
        return null;
      }
    },
    [aoAtualizar, notificar],
  );

  const concluir = useCallback(
    (t: Tarefa) =>
      executar(
        () => servicoTarefas.concluir(t.id),
        (nova) => (nova.recorrente ? `Feito. Próxima vez: ${formatarData(nova.proxima)}` : 'Tarefa concluída.'),
      ),
    [executar],
  );

  /** Desfaz o concluir; na cancelada, reativa. */
  const reabrir = useCallback(
    (t: Tarefa) =>
      t.status === 'CANCELADA'
        ? executar(() => servicoTarefas.alterarStatus(t.id, 'PENDENTE'), () => 'Tarefa reativada.')
        : executar(() => servicoTarefas.reabrir(t.id), () => 'Tarefa reaberta.'),
    [executar],
  );

  const excluir = useCallback(
    async (t: Tarefa) => {
      if (!(await confirmar(`Excluir a tarefa "${t.titulo}"?`, { rotuloConfirmar: 'Excluir' }))) return false;
      try {
        await servicoTarefas.excluir(t.id);
        aoExcluir?.(t.id);
        notificar('Tarefa excluída.');
        return true;
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
        return false;
      }
    },
    [aoExcluir, confirmar, notificar],
  );

  return { executar, concluir, reabrir, excluir };
}

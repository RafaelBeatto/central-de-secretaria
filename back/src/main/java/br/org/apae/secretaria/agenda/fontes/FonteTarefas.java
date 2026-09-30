package br.org.apae.secretaria.agenda.fontes;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.dto.ItemAgenda.OrigemItemAgenda;
import br.org.apae.secretaria.tarefas.StatusTarefa;
import br.org.apae.secretaria.tarefas.Tarefa;
import br.org.apae.secretaria.tarefas.TarefaRepositorio;
import lombok.RequiredArgsConstructor;

/** Tarefas da Secretaria no dia do prazo (a rotina, no dia da próxima vez). Canceladas não entram. */
@Component
@RequiredArgsConstructor
public class FonteTarefas implements FonteAgenda {

    private final TarefaRepositorio repositorio;

    @Override
    public String permissao() {
        return "TAREFA_LER";
    }

    @Override
    public List<ItemAgenda> itens(Long unidadeId, LocalDate inicio, LocalDate fim, LocalDate hoje) {
        return repositorio.comPrazoNoPeriodo(unidadeId, StatusTarefa.CANCELADA, inicio, fim).stream()
                .map(FonteTarefas::item).toList();
    }

    private static ItemAgenda item(Tarefa t) {
        return new ItemAgenda("TAREFA-" + t.getId(), OrigemItemAgenda.TAREFA, t.getId(), t.getTitulo(), null,
                t.getPrioridade(), t.prazoEfetivo(), t.getHorario(), null, null, t.getResponsavel(), null,
                t.getDescricao(), t.getStatus() == StatusTarefa.CONCLUIDA, null, t.recorrente());
    }
}

package br.org.apae.secretaria.agenda.fontes;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import br.org.apae.secretaria.agenda.Evento;
import br.org.apae.secretaria.agenda.EventoRepositorio;
import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.dto.ItemAgenda.OrigemItemAgenda;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class FonteEventos implements FonteAgenda {

    private final EventoRepositorio repositorio;

    @Override
    public String permissao() {
        return "AGENDA_LER";
    }

    @Override
    public List<ItemAgenda> itens(Long unidadeId, LocalDate inicio, LocalDate fim, LocalDate hoje) {
        return repositorio.doPeriodo(unidadeId, inicio, fim).stream().map(FonteEventos::item).toList();
    }

    public static ItemAgenda item(Evento e) {
        return new ItemAgenda("EVENTO-" + e.getId(), OrigemItemAgenda.EVENTO, e.getId(), e.getTitulo(), e.getTipo(),
                e.getPrioridade(), e.getData(), e.getHorarioInicio(), e.getHorarioFim(), e.getLocal(),
                e.getResponsavel(), e.getParticipantes(), e.getDescricao(), e.isConcluido(),
                e.getSerie() == null ? null : e.getSerie().getId(), e.emSerie());
    }
}

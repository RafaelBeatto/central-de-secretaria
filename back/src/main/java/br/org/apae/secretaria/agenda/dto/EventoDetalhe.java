package br.org.apae.secretaria.agenda.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import br.org.apae.secretaria.agenda.Evento;
import br.org.apae.secretaria.agenda.EventoSerie;
import br.org.apae.secretaria.agenda.TipoEvento;
import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.tarefas.Tarefa;

/**
 * Evento para o painel e o formulário. Numa série traz a posição ("3ª de 12"),
 * a última data e quantas faltam a partir desta ("Esta e as próximas (N)").
 */
public record EventoDetalhe(
        Long id, String titulo, TipoEvento tipo, Prioridade prioridade, LocalDate data, LocalTime horarioInicio,
        LocalTime horarioFim, String local, String responsavel, String participantes, String descricao,
        boolean concluido, Instant concluidoEm, Long tarefaId, String tarefaTitulo, Long serieId, Frequencia frequencia,
        LocalDate repetirAte, int posicao, int total, LocalDate primeiraData, LocalDate ultimaData, int restantes,
        Instant criadoEm, Instant atualizadoEm) {

    /** "serie" = todas as datas da série em ordem (vazia se o evento não se repete). */
    public static EventoDetalhe de(Evento e, List<Evento> serie) {
        Tarefa tarefa = e.getTarefa();
        EventoSerie s = e.getSerie();
        int posicao = serie.indexOf(e) + 1;
        boolean emSerie = s != null && !serie.isEmpty();
        return new EventoDetalhe(e.getId(), e.getTitulo(), e.getTipo(), e.getPrioridade(), e.getData(),
                e.getHorarioInicio(), e.getHorarioFim(), e.getLocal(), e.getResponsavel(), e.getParticipantes(),
                e.getDescricao(), e.isConcluido(), e.getConcluidoEm(), tarefa == null ? null : tarefa.getId(),
                tarefa == null ? null : tarefa.getTitulo(), emSerie ? s.getId() : null,
                emSerie ? s.getFrequencia() : null, emSerie ? s.getRepetirAte() : null, emSerie ? posicao : 1,
                emSerie ? serie.size() : 1, emSerie ? serie.get(0).getData() : e.getData(),
                emSerie ? serie.get(serie.size() - 1).getData() : e.getData(),
                emSerie ? serie.size() - posicao + 1 : 1, e.getCriadoEm(), e.getAtualizadoEm());
    }
}

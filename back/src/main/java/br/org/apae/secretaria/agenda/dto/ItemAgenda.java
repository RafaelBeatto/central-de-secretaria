package br.org.apae.secretaria.agenda.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.agenda.TipoEvento;
import br.org.apae.secretaria.comum.dominio.Prioridade;

/**
 * Qualquer coisa com data que aparece na agenda: evento, tarefa ou prazo de outro
 * módulo (vencimento de documento, início/fim de projeto). "chave" é única entre
 * as origens ("EVENTO-12", "TAREFA-5"…); "refId" é o id no módulo de origem.
 */
public record ItemAgenda(
        String chave, OrigemItemAgenda origem, Long refId, String titulo, TipoEvento tipoEvento, Prioridade prioridade,
        LocalDate data, LocalTime horarioInicio, LocalTime horarioFim, String local, String responsavel,
        String participantes, String descricao, boolean concluido, Long serieId, boolean recorrente) {

    public enum OrigemItemAgenda {
        EVENTO, TAREFA, DOCUMENTO, PROJETO
    }
}

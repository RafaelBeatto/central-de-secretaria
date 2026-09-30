package br.org.apae.secretaria.agenda.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.agenda.EscopoSerie;
import br.org.apae.secretaria.agenda.TipoEvento;
import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Formulário do evento (criar e editar).
 * - frequencia/repetirAte: só valem ao criar ou num evento que ainda não se repete
 *   (repetirAte vazio = fim do ano, ou um ano depois se faltar menos de 30 dias).
 * - escopo: numa série, se a edição vale só para esta data ou para esta e as próximas.
 */
public record RequisicaoEvento(
        @NotBlank @Size(max = Limites.EVENTO_TITULO) String titulo,
        @NotNull LocalDate data,
        @NotNull TipoEvento tipo,
        @NotNull Prioridade prioridade,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        @Size(max = Limites.EVENTO_LOCAL) String local,
        @Size(max = Limites.RESPONSAVEL) String responsavel,
        @Size(max = Limites.EVENTO_PARTICIPANTES) String participantes,
        @Size(max = Limites.TEXTO_LONGO) String descricao,
        Long tarefaId,
        Frequencia frequencia,
        LocalDate repetirAte,
        EscopoSerie escopo) {

    @AssertTrue(message = "O horário de término não pode ser antes do início.")
    public boolean isHorarioFimValido() {
        return horarioInicio == null || horarioFim == null || !horarioFim.isBefore(horarioInicio);
    }

    @AssertTrue(message = "A data final da repetição precisa ser depois da data do evento.")
    public boolean isRepetirAteValido() {
        return frequencia == null || repetirAte == null || data == null || !repetirAte.isBefore(data);
    }

    @AssertTrue(message = "Na edição de um evento, escolha só esta data ou esta e as próximas.")
    public boolean isEscopoValido() {
        return escopo != EscopoSerie.TODAS;
    }
}

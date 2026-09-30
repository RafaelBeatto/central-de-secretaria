package br.org.apae.secretaria.tarefas.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.tarefas.StatusTarefa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Pequenas alterações feitas direto na lista, no detalhe, no Kanban ou na Agenda. */
public final class RequisicoesAlteracao {

    private RequisicoesAlteracao() {
    }

    public record Status(@NotNull StatusTarefa status) {
    }

    public record NovaPrioridade(@NotNull Prioridade prioridade) {
    }

    public record NovaData(@NotNull LocalDate data) {
    }

    public record NovaSubtarefa(@NotBlank @Size(max = Limites.SUBTAREFA_TEXTO) String texto) {
    }

    public record MarcarSubtarefa(@NotNull Boolean feita) {
    }
}

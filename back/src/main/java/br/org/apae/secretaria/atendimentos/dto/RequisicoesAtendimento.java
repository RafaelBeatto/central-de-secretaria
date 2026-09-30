package br.org.apae.secretaria.atendimentos.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.atendimentos.MotivoFalta;
import br.org.apae.secretaria.atendimentos.Presenca;
import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Pequenas alterações feitas direto na tela ou no painel do atendimento. */
public final class RequisicoesAtendimento {

    private RequisicoesAtendimento() {
    }

    public record NovaPresenca(@NotNull Presenca presenca, MotivoFalta faltaMotivo,
            @Size(max = Limites.OBSERVACAO_CURTA) String faltaObservacao) {

        @AssertTrue(message = "Escolha o motivo da falta.")
        public boolean isMotivoValido() {
            return presenca != Presenca.FALTOU || faltaMotivo != null;
        }
    }

    public record Remarcar(@NotNull LocalDate data, @NotNull LocalTime horario, Long profissionalId,
            @Size(max = Limites.ATENDIMENTO_REMARCADO_MOTIVO) String motivo) {
    }

    public record RenomearCadastro(@NotBlank @Size(max = Limites.ATENDIMENTO_NOME) String nome) {
    }

    public record MesclarCadastro(@NotNull Long destinoId) {
    }
}

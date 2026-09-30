package br.org.apae.secretaria.atendimentos.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Um atendimento novo, avulso ou semanal. Aluno e profissional são criados se ainda
 * não existirem (usuários ligados a um profissional têm o nome preenchido sozinho).
 */
public record RequisicaoNovoAtendimento(
        @NotBlank @Size(max = Limites.ATENDIMENTO_NOME) String alunoNome,
        @NotBlank @Size(max = Limites.ATENDIMENTO_NOME) String profissionalNome,
        @NotNull LocalDate data,
        @NotNull LocalTime horario,
        @Size(max = Limites.OBSERVACAO_CURTA) String observacao,
        boolean semanal,
        LocalDate repetirAte) {

    @AssertTrue(message = "A data final da repetição precisa ser depois do primeiro atendimento.")
    public boolean isRepetirAteValido() {
        return !semanal || repetirAte == null || !repetirAte.isBefore(data);
    }
}

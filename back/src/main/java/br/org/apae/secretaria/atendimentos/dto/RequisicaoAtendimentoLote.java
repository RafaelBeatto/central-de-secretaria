package br.org.apae.secretaria.atendimentos.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * Vários atendimentos de uma vez (linhas aluno/profissional/dia/horário). Linhas
 * incompletas são ignoradas, como no antigo — por isso os campos aqui não são obrigatórios.
 */
public record RequisicaoAtendimentoLote(boolean semanal, @NotEmpty @Valid List<Linha> linhas) {

    public record Linha(@Size(max = Limites.ATENDIMENTO_NOME) String alunoNome,
            @Size(max = Limites.ATENDIMENTO_NOME) String profissionalNome, LocalDate data, LocalTime horario) {
    }
}

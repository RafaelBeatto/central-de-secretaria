package br.org.apae.secretaria.tarefas.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Formulário completo ("Mais opções"). frequencia vazia = tarefa de uma vez só. */
public record RequisicaoTarefa(
        @NotBlank @Size(max = Limites.TAREFA_TITULO) String titulo,
        @NotNull Prioridade prioridade,
        @NotNull LocalDate prazo,
        LocalTime horario,
        Frequencia frequencia,
        @Min(0) @Max(6) Short diaSemana,
        @Min(1) @Max(31) Short diaMes,
        @Size(max = Limites.RESPONSAVEL) String responsavel,
        @Size(max = Limites.TAREFA_CATEGORIA) String categoria,
        @Size(max = Limites.TEXTO_LONGO) String descricao) {

    @AssertTrue(message = "informe o dia da semana")
    public boolean isDiaSemanaInformado() {
        return frequencia != Frequencia.SEMANAL || diaSemana != null;
    }

    @AssertTrue(message = "informe o dia do mês")
    public boolean isDiaMesInformado() {
        return frequencia != Frequencia.MENSAL || diaMes != null;
    }
}

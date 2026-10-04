package br.org.apae.secretaria.relatorios.profissional.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.relatorios.profissional.TipoRelatorio;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Envio do PDF: o arquivo já foi enviado em {@code /api/arquivos} (categoria RELATORIO_PROFISSIONAL).
 * O período é opcional: sem "de" vale a data de hoje; sem "até" vale o "de".
 */
public record RequisicaoRelatorioProfissional(
        @NotBlank @Size(max = Limites.RELATORIO_PROF_TITULO) String nome,
        @NotNull TipoRelatorio tipo,
        @Size(max = Limites.RELATORIO_PROF_ALUNO) String nomeAluno,
        @Size(max = Limites.RELATORIO_PROF_COMPLEMENTO) String complemento,
        LocalDate periodoInicio,
        LocalDate periodoFim,
        @NotNull Long arquivoId) {

    @AssertTrue(message = "Informe o nome do aluno.")
    public boolean isAlunoInformado() {
        return tipo != TipoRelatorio.PESSOAL || (nomeAluno != null && !nomeAluno.isBlank());
    }

    @AssertTrue(message = "O fim do período não pode ser antes do início.")
    public boolean isPeriodoValido() {
        return periodoInicio == null || periodoFim == null || !periodoFim.isBefore(periodoInicio);
    }
}

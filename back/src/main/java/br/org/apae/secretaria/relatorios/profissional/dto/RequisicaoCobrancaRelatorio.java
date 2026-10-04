package br.org.apae.secretaria.relatorios.profissional.dto;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.relatorios.profissional.TipoRelatorio;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cobrança da Central: o que o profissional deve produzir. */
public record RequisicaoCobrancaRelatorio(
        @NotBlank @Size(max = Limites.RELATORIO_PROF_TITULO) String nome,
        @NotNull TipoRelatorio tipo,
        @Size(max = Limites.RELATORIO_PROF_ALUNO) String nomeAluno,
        @Size(max = Limites.RELATORIO_PROF_COMPLEMENTO) String complemento) {

    @AssertTrue(message = "Informe o nome do aluno.")
    public boolean isAlunoInformado() {
        return tipo != TipoRelatorio.PESSOAL || (nomeAluno != null && !nomeAluno.isBlank());
    }
}

package br.org.apae.secretaria.relatorios.profissional.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/** Atende a uma cobrança: o PDF e, se quiser, o período (mesmas regras de padrão do envio avulso). */
public record RequisicaoEntregaRelatorio(LocalDate periodoInicio, LocalDate periodoFim, @NotNull Long arquivoId) {

    @AssertTrue(message = "O fim do período não pode ser antes do início.")
    public boolean isPeriodoValido() {
        return periodoInicio == null || periodoFim == null || !periodoFim.isBefore(periodoInicio);
    }
}

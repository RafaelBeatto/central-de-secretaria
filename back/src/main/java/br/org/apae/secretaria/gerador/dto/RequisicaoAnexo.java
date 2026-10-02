package br.org.apae.secretaria.gerador.dto;

import jakarta.validation.constraints.NotNull;

/** Anexo já enviado ao S3 (categoria ANEXO_GERADOR) a ligar ao documento gerado. */
public record RequisicaoAnexo(@NotNull Long arquivoId) {
}

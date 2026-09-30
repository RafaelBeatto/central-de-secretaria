package br.org.apae.secretaria.acesso.usuario.dto;

import jakarta.validation.constraints.NotNull;

public record RequisicaoSituacao(@NotNull Boolean ativo) {
}

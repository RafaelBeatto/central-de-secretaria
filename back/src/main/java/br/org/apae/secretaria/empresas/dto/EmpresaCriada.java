package br.org.apae.secretaria.empresas.dto;

/** Ao cadastrar, o mesmo CNPJ ou nome já existente reaproveita a empresa em vez de duplicar. */
public record EmpresaCriada(EmpresaResposta empresa, boolean jaExistia) {
}

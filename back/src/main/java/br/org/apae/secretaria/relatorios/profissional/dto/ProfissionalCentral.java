package br.org.apae.secretaria.relatorios.profissional.dto;

/** Linha da Central de Relatórios: um professor/profissional, os relatórios entregues e as cobranças pendentes. */
public record ProfissionalCentral(Long usuarioId, String nome, String cargo, long total, long pendentes) {
}

package br.org.apae.secretaria.tarefas.dto;

import java.util.List;

/** Valores já usados na unidade, sugeridos nos campos Responsável e Categoria. */
public record SugestoesTarefa(List<String> responsaveis, List<String> categorias) {
}

package br.org.apae.secretaria.pesquisa.dto;

import java.util.List;

/** Uma linha da pesquisa geral: o tipo e o id levam ao registro; "detalhes" é o texto de apoio da linha. */
public record ResultadoPesquisa(TipoResultado tipo, Long id, String titulo, List<String> detalhes) {

    public enum TipoResultado {
        TAREFA, EVENTO, DOCUMENTO, GERADO, RECURSO, EXECUCAO, EMPRESA, ALUNO, PROFISSIONAL
    }
}

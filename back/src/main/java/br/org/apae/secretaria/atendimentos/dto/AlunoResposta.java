package br.org.apae.secretaria.atendimentos.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.atendimentos.Aluno;

public record AlunoResposta(Long id, String nome, LocalDate faltasContatoAte, long totalAtendimentos) {

    public static AlunoResposta de(Aluno aluno, long totalAtendimentos) {
        return new AlunoResposta(aluno.getId(), aluno.getNome(), aluno.getFaltasContatoAte(), totalAtendimentos);
    }
}

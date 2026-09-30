package br.org.apae.secretaria.atendimentos.dto;

import br.org.apae.secretaria.atendimentos.Profissional;

public record ProfissionalResposta(Long id, String nome, long totalAtendimentos) {

    public static ProfissionalResposta de(Profissional profissional, long totalAtendimentos) {
        return new ProfissionalResposta(profissional.getId(), profissional.getNome(), totalAtendimentos);
    }
}

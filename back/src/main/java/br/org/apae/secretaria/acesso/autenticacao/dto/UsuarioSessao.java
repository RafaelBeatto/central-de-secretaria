package br.org.apae.secretaria.acesso.autenticacao.dto;

import java.util.Set;

import br.org.apae.secretaria.acesso.unidade.TipoUnidade;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;

/** O que o front precisa saber do usuário logado para montar menu, rotas e permissões. */
public record UsuarioSessao(
        Long id,
        String login,
        String nome,
        String nomeCompleto,
        Cargo cargo,
        Unidade unidade,
        boolean trocarSenha,
        Set<String> permissoes) {

    public record Cargo(String codigo, String nome, short nivel) {
    }

    public record Unidade(Long id, String nome, TipoUnidade tipo) {
    }

    public static UsuarioSessao de(UsuarioAutenticado u) {
        return new UsuarioSessao(u.id(), u.login(), u.nome(), u.nomeCompleto(),
                new Cargo(u.cargoCodigo(), u.cargoNome(), u.nivelCargo()),
                new Unidade(u.unidadeId(), u.unidadeNome(), u.unidadeTipo()),
                u.trocarSenha(), u.trocarSenha() ? Set.of() : u.permissoes());
    }
}

package br.org.apae.secretaria.acesso.usuario.dto;

import java.time.Instant;

import br.org.apae.secretaria.acesso.usuario.Usuario;

/** Linha da lista de usuários. */
public record UsuarioResumo(Long id, String login, String nomeCompleto, String cargoCodigo, String cargoNome,
        Long unidadeId, String unidadeNome, boolean ativo, Instant ultimoAcessoEm) {

    public static UsuarioResumo de(Usuario u) {
        return new UsuarioResumo(u.getId(), u.getLogin(), u.nomeCompleto(), u.getCargo().getCodigo(),
                u.getCargo().getNome(), u.getUnidade().getId(), u.getUnidade().getNome(), u.isAtivo(),
                u.getUltimoAcessoEm());
    }
}

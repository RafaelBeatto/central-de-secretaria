package br.org.apae.secretaria.chat.dto;

import br.org.apae.secretaria.acesso.usuario.Usuario;

/** Colega de unidade com quem se pode conversar. */
public record ContatoChat(Long id, String nomeCompleto, String cargoNome) {

    public static ContatoChat de(Usuario usuario) {
        return new ContatoChat(usuario.getId(), usuario.nomeCompleto(), usuario.getCargo().getNome());
    }
}

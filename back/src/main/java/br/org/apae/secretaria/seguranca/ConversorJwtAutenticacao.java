package br.org.apae.secretaria.seguranca;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Transforma o JWT validado no usuário da requisição. As permissões vêm do cache
 * (e não do token), então uma mudança na matriz vale na hora, sem novo login.
 * Quem ainda precisa trocar a senha fica sem nenhuma permissão até trocá-la.
 */
@Component
@RequiredArgsConstructor
public class ConversorJwtAutenticacao implements Converter<Jwt, AbstractAuthenticationToken> {

    private final ServicoUsuarioAutenticado servicoUsuario;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UsuarioAutenticado usuario = autenticar(jwt);
        return new UsernamePasswordAuthenticationToken(usuario, jwt, autoridades(usuario));
    }

    public UsuarioAutenticado autenticar(Jwt jwt) {
        UsuarioAutenticado usuario = servicoUsuario.carregar(Long.valueOf(jwt.getSubject()));
        if (!usuario.ativo()) {
            throw new DisabledException("Usuário desativado.");
        }
        return usuario;
    }

    public static List<GrantedAuthority> autoridades(UsuarioAutenticado usuario) {
        if (usuario.trocarSenha()) {
            return List.of();
        }
        return usuario.permissoes().stream().<GrantedAuthority>map(SimpleGrantedAuthority::new).toList();
    }
}

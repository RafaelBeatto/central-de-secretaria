package br.org.apae.secretaria.acesso.autenticacao;

import java.time.Instant;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.autenticacao.dto.RequisicaoTrocarSenha;
import br.org.apae.secretaria.acesso.autenticacao.dto.RespostaSessao;
import br.org.apae.secretaria.acesso.autenticacao.dto.UsuarioSessao;
import br.org.apae.secretaria.acesso.usuario.Usuario;
import br.org.apae.secretaria.acesso.usuario.UsuarioRepositorio;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.ServicoToken;
import br.org.apae.secretaria.seguranca.ServicoUsuarioAutenticado;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ServicoAutenticacao {

    private static final String CREDENCIAIS_INVALIDAS = "Usuário ou senha inválidos.";

    private final UsuarioRepositorio usuarios;
    private final TokenRenovacaoRepositorio tokens;
    private final PasswordEncoder codificadorSenha;
    private final ServicoToken servicoToken;
    private final ServicoUsuarioAutenticado servicoUsuario;
    private final ContextoSeguranca contexto;

    /** Hash qualquer, usado quando o login não existe, para o tempo de resposta não denunciar isso. */
    private static final String HASH_FICTICIO = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5BW4RRY1vSGIzSmAc1S9R8fBL2F3S";

    @Transactional
    public RespostaSessao entrar(String login, String senha) {
        Usuario usuario = usuarios.findByLoginIgnoreCase(login.trim()).orElse(null);
        boolean senhaConfere = codificadorSenha.matches(senha, usuario != null ? usuario.getSenhaHash() : HASH_FICTICIO);
        if (usuario == null || !senhaConfere || !usuario.isAtivo() || !usuario.getUnidade().isAtivo()) {
            throw new BadCredentialsException(CREDENCIAIS_INVALIDAS);
        }
        usuario.setUltimoAcessoEm(Instant.now());
        return abrirSessao(usuario);
    }

    /** Troca o token de renovação por um novo par. Reuso de token já trocado encerra todas as sessões. */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public RespostaSessao renovar(String tokenRenovacao) {
        TokenRenovacao atual = tokens.findByTokenHash(ServicoToken.hash(tokenRenovacao))
                .orElseThrow(() -> new BadCredentialsException("Sessão expirada."));
        if (atual.isRevogado()) {
            tokens.revogarTodos(atual.getUsuarioId());
            throw new BadCredentialsException("Sessão encerrada por segurança. Entre novamente.");
        }
        if (!atual.valido()) {
            throw new BadCredentialsException("Sessão expirada.");
        }
        atual.revogar();
        Usuario usuario = usuarios.findComCargoEUnidadeById(atual.getUsuarioId())
                .filter(Usuario::isAtivo)
                .orElseThrow(() -> new BadCredentialsException("Sessão expirada."));
        return abrirSessao(usuario);
    }

    @Transactional
    public void sair(String tokenRenovacao) {
        tokens.findByTokenHash(ServicoToken.hash(tokenRenovacao)).ifPresent(TokenRenovacao::revogar);
    }

    @Transactional(readOnly = true)
    public UsuarioSessao eu() {
        return UsuarioSessao.de(contexto.usuario());
    }

    @Transactional
    public UsuarioSessao trocarSenha(RequisicaoTrocarSenha requisicao) {
        Usuario usuario = usuarios.findById(contexto.usuario().id()).orElseThrow();
        if (!codificadorSenha.matches(requisicao.senhaAtual(), usuario.getSenhaHash())) {
            throw new RegraNegocioExcecao("A senha atual não confere.");
        }
        if (requisicao.senhaAtual().equals(requisicao.novaSenha())) {
            throw new RegraNegocioExcecao("A nova senha precisa ser diferente da atual.");
        }
        usuario.setSenhaHash(codificadorSenha.encode(requisicao.novaSenha()));
        usuario.setTrocarSenha(false);
        servicoUsuario.esquecer(usuario.getId());
        return UsuarioSessao.de(servicoUsuario.carregar(usuario.getId()));
    }

    private RespostaSessao abrirSessao(Usuario usuario) {
        var acesso = servicoToken.emitirAcesso(usuario);
        var renovacao = servicoToken.gerarRenovacao();
        tokens.save(new TokenRenovacao(usuario.getId(), ServicoToken.hash(renovacao.valor()), renovacao.expiraEm()));
        servicoUsuario.esquecer(usuario.getId());
        return new RespostaSessao(acesso.valor(), acesso.expiraEm(), renovacao.valor(),
                UsuarioSessao.de(servicoUsuario.carregar(usuario.getId())));
    }
}

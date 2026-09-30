package br.org.apae.secretaria.seguranca;

import java.util.Set;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.permissao.PermissaoRepositorio;
import br.org.apae.secretaria.acesso.usuario.Usuario;
import br.org.apae.secretaria.acesso.usuario.UsuarioRepositorio;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import lombok.RequiredArgsConstructor;

/**
 * Carrega o usuário com as permissões efetivas (matriz padrão + ajustes da unidade).
 * Fica em cache para não consultar o banco a cada requisição; qualquer alteração
 * de usuário ou da matriz precisa chamar {@link #esquecer} ou {@link #esquecerTodos}.
 */
@Service
@RequiredArgsConstructor
public class ServicoUsuarioAutenticado {

    public static final String CACHE = "usuarios-autenticados";

    private final UsuarioRepositorio usuarios;
    private final PermissaoRepositorio permissoes;

    @Cacheable(cacheNames = CACHE, key = "#usuarioId")
    @Transactional(readOnly = true)
    public UsuarioAutenticado carregar(Long usuarioId) {
        Usuario usuario = usuarios.findComCargoEUnidadeById(usuarioId)
                .orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
        var cargo = usuario.getCargo();
        var unidade = usuario.getUnidade();
        Set<String> codigos = cargo.administradorSistema()
                ? permissoes.todosCodigos()
                : permissoes.codigosEfetivos(cargo.getId(), unidade.getId());
        return new UsuarioAutenticado(usuario.getId(), usuario.getLogin(), usuario.getNome(), usuario.nomeCompleto(),
                cargo.getId(), cargo.getCodigo(), cargo.getNome(), cargo.getNivel(),
                unidade.getId(), unidade.getNome(), unidade.getTipo(), unidade.getCaminho(),
                usuario.isAtivo(), usuario.isTrocarSenha(), Set.copyOf(codigos));
    }

    @CacheEvict(cacheNames = CACHE, key = "#usuarioId")
    public void esquecer(Long usuarioId) {
        // Só remove do cache; o próximo acesso recarrega do banco.
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    public void esquecerTodos() {
        // Usado quando a matriz de permissões muda (afeta vários usuários de uma vez).
    }
}

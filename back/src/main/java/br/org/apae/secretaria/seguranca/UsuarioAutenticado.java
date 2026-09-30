package br.org.apae.secretaria.seguranca;

import java.io.Serializable;
import java.security.Principal;
import java.util.Set;

import br.org.apae.secretaria.acesso.cargo.Cargo;
import br.org.apae.secretaria.acesso.unidade.TipoUnidade;

/**
 * Retrato imutável do usuário logado, montado uma vez e guardado em cache.
 * O nome do Principal é o id: é por ele que o chat entrega mensagens (/user/{id}/queue/...).
 */
public record UsuarioAutenticado(
        Long id,
        String login,
        String nome,
        String nomeCompleto,
        short cargoId,
        String cargoCodigo,
        String cargoNome,
        short nivelCargo,
        Long unidadeId,
        String unidadeNome,
        TipoUnidade unidadeTipo,
        String caminhoUnidade,
        boolean ativo,
        boolean trocarSenha,
        Set<String> permissoes) implements Principal, Serializable {

    @Override
    public String getName() {
        return String.valueOf(id);
    }

    public boolean administradorSistema() {
        return Cargo.ADMINISTRADOR_SISTEMA.equals(cargoCodigo);
    }

    public boolean possui(String permissao) {
        return permissoes.contains(permissao);
    }

    /** Verdadeiro se a unidade (pelo caminho) é a do usuário ou está abaixo dela. */
    public boolean alcanca(String caminhoOutraUnidade) {
        return caminhoOutraUnidade.startsWith(caminhoUnidade);
    }
}

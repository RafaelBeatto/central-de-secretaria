package br.org.apae.secretaria.seguranca;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import br.org.apae.secretaria.acesso.unidade.UnidadeRepositorio;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import lombok.RequiredArgsConstructor;

/**
 * Ponto único das regras de escopo por unidade:
 * - LEITURA: a própria unidade ou qualquer subordinada. O front informa qual está
 *   consultando no cabeçalho {@value #CABECALHO_UNIDADE}; sem ele, vale a própria.
 * - ESCRITA: só a própria unidade (unidade superior apenas acompanha as de baixo).
 * Todos os serviços de negócio usam estes métodos, sem repetir a regra.
 */
@Component
@RequiredArgsConstructor
public class ContextoSeguranca {

    public static final String CABECALHO_UNIDADE = "X-Unidade";

    private final UnidadeRepositorio unidades;

    public UsuarioAutenticado usuario() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao != null && autenticacao.getPrincipal() instanceof UsuarioAutenticado usuario) {
            return usuario;
        }
        throw new AcessoNegadoExcecao("Sessão expirada. Entre novamente.");
    }

    /** Unidade cujos dados o usuário está consultando (a própria ou uma subordinada). */
    public Long unidadeLeitura() {
        Long solicitada = unidadeDoCabecalho();
        if (solicitada == null) {
            return usuario().unidadeId();
        }
        exigirLeitura(solicitada);
        return solicitada;
    }

    /** Unidade em que o usuário pode gravar: sempre a própria. */
    public Long unidadeEscrita() {
        Long solicitada = unidadeDoCabecalho();
        Long propria = usuario().unidadeId();
        if (solicitada != null && !solicitada.equals(propria)) {
            throw new AcessoNegadoExcecao("Os dados de outra unidade podem ser consultados, mas não alterados.");
        }
        return propria;
    }

    /** Garante que um registro (pela unidade dele) está no alcance de leitura do usuário. */
    public void exigirLeitura(Long unidadeDoRegistro) {
        if (unidadeDoRegistro.equals(usuario().unidadeId())) {
            return;
        }
        String caminho = unidades.findById(unidadeDoRegistro)
                .orElseThrow(() -> new NaoEncontradoExcecao("Unidade"))
                .getCaminho();
        if (!usuario().alcanca(caminho)) {
            throw new NaoEncontradoExcecao("Registro");
        }
    }

    /** Garante que um registro pertence à unidade do usuário antes de alterá-lo. */
    public void exigirEscrita(Long unidadeDoRegistro) {
        if (!unidadeDoRegistro.equals(unidadeEscrita())) {
            exigirLeitura(unidadeDoRegistro);
            throw new AcessoNegadoExcecao("Os dados de outra unidade podem ser consultados, mas não alterados.");
        }
    }

    private static Long unidadeDoCabecalho() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos)) {
            return null;
        }
        String valor = atributos.getRequest().getHeader(CABECALHO_UNIDADE);
        if (!StringUtils.hasText(valor)) {
            return null;
        }
        try {
            return Long.valueOf(valor.trim());
        } catch (NumberFormatException e) {
            throw new NaoEncontradoExcecao("Unidade");
        }
    }
}

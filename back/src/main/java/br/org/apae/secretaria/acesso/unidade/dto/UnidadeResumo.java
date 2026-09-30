package br.org.apae.secretaria.acesso.unidade.dto;

import br.org.apae.secretaria.acesso.unidade.TipoUnidade;
import br.org.apae.secretaria.acesso.unidade.Unidade;

/** Linha da árvore de unidades (seletor "Visualizando" e tela de unidades). */
public record UnidadeResumo(Long id, String nome, TipoUnidade tipo, String uf, String municipio, Long unidadePaiId,
        int profundidade, boolean ativo) {

    public static UnidadeResumo de(Unidade unidade, int profundidadeBase) {
        int profundidade = (int) unidade.getCaminho().chars().filter(c -> c == '/').count() - 2 - profundidadeBase;
        return new UnidadeResumo(unidade.getId(), unidade.getNome(), unidade.getTipo(), unidade.getUf(),
                unidade.getMunicipio(), unidade.getUnidadePai() == null ? null : unidade.getUnidadePai().getId(),
                profundidade, unidade.isAtivo());
    }
}

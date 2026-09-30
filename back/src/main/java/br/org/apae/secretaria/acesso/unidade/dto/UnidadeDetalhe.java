package br.org.apae.secretaria.acesso.unidade.dto;

import br.org.apae.secretaria.acesso.unidade.TipoUnidade;
import br.org.apae.secretaria.acesso.unidade.Unidade;

/** Dados completos, incluindo os institucionais do cabeçalho/rodapé dos documentos. */
public record UnidadeDetalhe(
        Long id, String nome, TipoUnidade tipo, String uf, String municipio, Long unidadePaiId, boolean ativo,
        String cnpj, String endereco, String telefone, String email, String cidadeUf, String site,
        String presidente, String cpfPresidente,
        String rodapeTexto, boolean rodapeEndereco, boolean rodapeTelefone, boolean rodapeEmail, boolean rodapeSite,
        boolean rodapeMostrarPagina, Long logoArquivoId) {

    public static UnidadeDetalhe de(Unidade u) {
        return new UnidadeDetalhe(u.getId(), u.getNome(), u.getTipo(), u.getUf(), u.getMunicipio(),
                u.getUnidadePai() == null ? null : u.getUnidadePai().getId(), u.isAtivo(),
                u.getCnpj(), u.getEndereco(), u.getTelefone(), u.getEmail(), u.getCidadeUf(), u.getSite(),
                u.getPresidente(), u.getCpfPresidente(),
                u.getRodapeTexto(), u.isRodapeEndereco(), u.isRodapeTelefone(), u.isRodapeEmail(), u.isRodapeSite(),
                u.isRodapeMostrarPagina(), u.getLogoArquivoId());
    }
}

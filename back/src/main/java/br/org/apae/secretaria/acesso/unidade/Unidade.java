package br.org.apae.secretaria.acesso.unidade;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * APAE (municipal) ou federação (estadual/nacional). Guarda também os dados
 * institucionais que vão no cabeçalho/rodapé de todos os documentos e PDFs.
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "unidade", schema = "acesso")
public class Unidade extends EntidadeAuditavel {

    @Enumerated(EnumType.STRING)
    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = 10, updatable = false)
    private TipoUnidade tipo;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_pai_id", updatable = false)
    private Unidade unidadePai;

    /** Caminho materializado ("/1/4/17/") usado para achar subordinadas por prefixo. */
    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = 255)
    private String caminho = "/";

    @Column(nullable = false, length = Limites.UNIDADE_NOME)
    private String nome;

    @Column(columnDefinition = "bpchar(2)", length = Limites.UF)
    private String uf;

    @Column(length = Limites.MUNICIPIO)
    private String municipio;

    @Column(length = Limites.CNPJ)
    private String cnpj;

    @Column(length = Limites.UNIDADE_ENDERECO)
    private String endereco;

    @Column(length = Limites.TELEFONE)
    private String telefone;

    @Column(length = Limites.EMAIL)
    private String email;

    @Column(name = "cidade_uf", length = Limites.UNIDADE_CIDADE_UF)
    private String cidadeUf;

    @Column(length = Limites.UNIDADE_SITE)
    private String site;

    @Column(length = Limites.NOME_PESSOA)
    private String presidente;

    @Column(name = "cpf_presidente", length = Limites.CPF)
    private String cpfPresidente;

    @Column(name = "rodape_texto", length = Limites.UNIDADE_RODAPE)
    private String rodapeTexto;

    @Column(name = "rodape_endereco", nullable = false)
    private boolean rodapeEndereco;

    @Column(name = "rodape_telefone", nullable = false)
    private boolean rodapeTelefone;

    @Column(name = "rodape_email", nullable = false)
    private boolean rodapeEmail;

    @Column(name = "rodape_site", nullable = false)
    private boolean rodapeSite;

    @Column(name = "rodape_mostrar_pagina", nullable = false)
    private boolean rodapeMostrarPagina;

    @Column(name = "logo_arquivo_id")
    private Long logoArquivoId;

    @Column(nullable = false)
    private boolean ativo = true;

    /** Cria uma unidade subordinada; o tipo é sempre o nível abaixo do pai. */
    public static Unidade subordinadaDe(Unidade pai, String nome) {
        Unidade unidade = new Unidade();
        unidade.tipo = pai.getTipo().tipoDasSubordinadas()
                .orElseThrow(() -> new IllegalStateException("Unidade municipal não tem subordinadas."));
        unidade.unidadePai = pai;
        unidade.nome = nome;
        return unidade;
    }

    /** Só é possível montar o caminho depois que o banco gera o id. */
    public void definirCaminho() {
        caminho = (unidadePai == null ? "/" : unidadePai.getCaminho()) + getId() + "/";
    }

    public boolean contem(Unidade outra) {
        return outra.getCaminho().startsWith(caminho);
    }
}

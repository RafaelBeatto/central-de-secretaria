package br.org.apae.secretaria.documentos;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Documento institucional com validade e histórico de versões (old/js/06-documentos.js).
 * Renovar guarda o número/emissão/validade/arquivo atuais como uma {@link DocumentoVersao}
 * e assume os novos valores — o arquivo some a não ser que um novo seja enviado, igual ao antigo.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "documento", schema = "documentos")
public class Documento extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(nullable = false, updatable = false, length = Limites.CODIGO)
    private String codigo;

    @Setter
    @Column(nullable = false, length = Limites.DOCUMENTO_NOME)
    private String nome;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CategoriaDocumento categoria;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "exigencia_apae", length = 40)
    private ExigenciaApae exigenciaApae;

    @Setter
    @Column(length = Limites.DOCUMENTO_NUMERO)
    private String numero;

    @Setter
    @Column(length = Limites.DOCUMENTO_ORGAO)
    private String orgao;

    @Setter
    @Column(length = Limites.RESPONSAVEL)
    private String responsavel;

    @Setter
    @Column(name = "data_emissao")
    private LocalDate dataEmissao;

    @Setter
    @Column(name = "data_validade")
    private LocalDate dataValidade;

    @Setter
    @Column(name = "local_guardado", length = Limites.DOCUMENTO_LOCAL_GUARDADO)
    private String localGuardado;

    @Setter
    @Column(length = Limites.DOCUMENTO_TAGS)
    private String tags;

    @Setter
    @Column(length = Limites.TEXTO_LONGO)
    private String descricao;

    @Setter
    @Column(length = Limites.TEXTO_LONGO)
    private String observacoes;

    @Setter
    @Column(name = "arquivo_id")
    private Long arquivoId;

    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public Documento(Long unidadeId, String codigo, String nome, CategoriaDocumento categoria,
            ExigenciaApae exigenciaApae, String numero, String orgao, String responsavel, LocalDate dataEmissao,
            LocalDate dataValidade, String localGuardado, String tags, String descricao, String observacoes,
            Long arquivoId, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.codigo = codigo;
        this.nome = nome;
        this.categoria = categoria;
        this.exigenciaApae = exigenciaApae;
        this.numero = numero;
        this.orgao = orgao;
        this.responsavel = responsavel;
        this.dataEmissao = dataEmissao;
        this.dataValidade = dataValidade;
        this.localGuardado = localGuardado;
        this.tags = tags;
        this.descricao = descricao;
        this.observacoes = observacoes;
        this.arquivoId = arquivoId;
        this.criadoPorId = criadoPorId;
    }

    /**
     * Guarda o estado atual como versão anterior e assume os novos dados.
     * O arquivo atual só continua se {@code novoArquivoId} vier preenchido.
     */
    public DocumentoVersao renovar(LocalDate novaEmissao, LocalDate novaValidade, String novoNumero, Long novoArquivoId) {
        DocumentoVersao versaoAnterior = new DocumentoVersao(getId(), numero, dataEmissao, dataValidade, arquivoId);
        this.numero = novoNumero;
        this.dataEmissao = novaEmissao;
        this.dataValidade = novaValidade;
        this.arquivoId = novoArquivoId;
        return versaoAnterior;
    }
}

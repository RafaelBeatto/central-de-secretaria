package br.org.apae.secretaria.documentos;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Estado anterior de um {@link Documento}, guardado a cada renovação. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "documento_versao", schema = "documentos")
public class DocumentoVersao extends EntidadeBase {

    @Column(name = "documento_id", nullable = false, updatable = false)
    private Long documentoId;

    @Column(length = Limites.DOCUMENTO_NUMERO, updatable = false)
    private String numero;

    @Column(name = "data_emissao", updatable = false)
    private LocalDate dataEmissao;

    @Column(name = "data_validade", updatable = false)
    private LocalDate dataValidade;

    @Column(name = "arquivo_id", updatable = false)
    private Long arquivoId;

    @Column(name = "substituida_em", nullable = false, updatable = false)
    private Instant substituidaEm;

    public DocumentoVersao(Long documentoId, String numero, LocalDate dataEmissao, LocalDate dataValidade,
            Long arquivoId) {
        this.documentoId = documentoId;
        this.numero = numero;
        this.dataEmissao = dataEmissao;
        this.dataValidade = dataValidade;
        this.arquivoId = arquivoId;
    }

    @PrePersist
    protected void aoCriar() {
        substituidaEm = Instant.now();
    }
}

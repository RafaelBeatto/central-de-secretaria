package br.org.apae.secretaria.gerador;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Estado anterior de um {@link DocumentoGerado}, guardado a cada edição (só para consulta). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "documento_gerado_versao", schema = "gerador")
public class DocumentoGeradoVersao extends EntidadeBase {

    @Column(name = "documento_gerado_id", nullable = false, updatable = false)
    private Long documentoGeradoId;

    @Column(nullable = false, updatable = false)
    private int versao;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, String> valores;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, String> contexto;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, updatable = false, columnDefinition = "jsonb")
    private List<List<String>> assinaturas;

    @Column(name = "texto_snapshot", nullable = false, updatable = false, length = Limites.GERADOR_TEXTO)
    private String textoSnapshot;

    @Column(name = "salvo_em", nullable = false, updatable = false)
    private Instant salvoEm;

    DocumentoGeradoVersao(DocumentoGerado atual, Instant salvoEm) {
        this.documentoGeradoId = atual.getId();
        this.versao = atual.getVersao();
        this.valores = atual.getValores();
        this.contexto = atual.getContexto();
        this.assinaturas = atual.getAssinaturas();
        this.textoSnapshot = atual.getTextoSnapshot();
        this.salvoEm = salvoEm;
    }
}

package br.org.apae.secretaria.sistema.arquivo;

import java.time.Instant;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Referência a um objeto guardado na AWS S3. O conteúdo nunca vai para o banco. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "arquivo", schema = "sistema")
public class Arquivo extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(name = "chave_s3", nullable = false, unique = true, length = Limites.ARQUIVO_CHAVE, updatable = false)
    private String chaveS3;

    @Column(name = "nome_original", nullable = false, length = Limites.ARQUIVO_NOME, updatable = false)
    private String nomeOriginal;

    @Column(name = "tipo_conteudo", nullable = false, length = Limites.ARQUIVO_TIPO, updatable = false)
    private String tipoConteudo;

    @Column(name = "tamanho_bytes", nullable = false, updatable = false)
    private long tamanhoBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = Limites.ARQUIVO_CATEGORIA, updatable = false)
    private CategoriaArquivo categoria;

    @Column(name = "enviado_por_id", updatable = false)
    private Long enviadoPorId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    Arquivo(Long unidadeId, String chaveS3, String nomeOriginal, String tipoConteudo, long tamanhoBytes,
            CategoriaArquivo categoria, Long enviadoPorId) {
        this.unidadeId = unidadeId;
        this.chaveS3 = chaveS3;
        this.nomeOriginal = nomeOriginal;
        this.tipoConteudo = tipoConteudo;
        this.tamanhoBytes = tamanhoBytes;
        this.categoria = categoria;
        this.enviadoPorId = enviadoPorId;
        this.criadoEm = Instant.now();
    }
}

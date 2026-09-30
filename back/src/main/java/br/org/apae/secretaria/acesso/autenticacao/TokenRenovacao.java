package br.org.apae.secretaria.acesso.autenticacao;

import java.time.Instant;

import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Token de renovação de sessão. Só o hash é guardado; cada uso gera um novo (rotação). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "token_renovacao", schema = "acesso")
public class TokenRenovacao extends EntidadeBase {

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "bpchar(64)", updatable = false)
    private String tokenHash;

    @Column(name = "expira_em", nullable = false, updatable = false)
    private Instant expiraEm;

    @Column(nullable = false)
    private boolean revogado;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    TokenRenovacao(Long usuarioId, String tokenHash, Instant expiraEm) {
        this.usuarioId = usuarioId;
        this.tokenHash = tokenHash;
        this.expiraEm = expiraEm;
        this.criadoEm = Instant.now();
    }

    boolean valido() {
        return !revogado && expiraEm.isAfter(Instant.now());
    }

    void revogar() {
        revogado = true;
    }
}

package br.org.apae.secretaria.comum.entidade;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Getter;

/** Base de registros que só têm {@code criado_em} (itens que não são editados depois de criados). */
@Getter
@MappedSuperclass
public abstract class EntidadeCriada extends EntidadeBase {

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    protected void aoCriar() {
        criadoEm = Instant.now();
    }
}

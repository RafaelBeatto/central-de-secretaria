package br.org.apae.secretaria.comum.entidade;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;

/** Entidade com datas de criação e última alteração preenchidas automaticamente. */
@Getter
@MappedSuperclass
public abstract class EntidadeAuditavel extends EntidadeBase {

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @PrePersist
    protected void aoCriar() {
        criadoEm = Instant.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    protected void aoAtualizar() {
        atualizadoEm = Instant.now();
    }
}

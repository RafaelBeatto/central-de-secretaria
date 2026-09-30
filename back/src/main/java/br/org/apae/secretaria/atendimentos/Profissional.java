package br.org.apae.secretaria.atendimentos;

import java.time.Instant;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Profissional que atende (cadastro criado ao digitar o nome, ou automaticamente
 * ligado a um usuário professor/profissional no primeiro acesso ao módulo).
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "profissional", schema = "atendimentos")
public class Profissional extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter
    @Column(nullable = false, length = Limites.ATENDIMENTO_NOME)
    private String nome;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    public Profissional(Long unidadeId, String nome, Long usuarioId) {
        this.unidadeId = unidadeId;
        this.nome = nome;
        this.usuarioId = usuarioId;
    }

    @PrePersist
    protected void aoCriar() {
        criadoEm = Instant.now();
    }
}

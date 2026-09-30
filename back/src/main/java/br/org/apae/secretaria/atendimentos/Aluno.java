package br.org.apae.secretaria.atendimentos;

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
import lombok.Setter;

/** Aluno atendido (cadastro criado ao digitar o nome num atendimento). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "aluno", schema = "atendimentos")
public class Aluno extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter
    @Column(nullable = false, length = Limites.ATENDIMENTO_NOME)
    private String nome;

    /** Data da última falta já tratada com a família (o aviso só volta com falta nova). */
    @Setter
    @Column(name = "faltas_contato_ate")
    private LocalDate faltasContatoAte;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    public Aluno(Long unidadeId, String nome) {
        this.unidadeId = unidadeId;
        this.nome = nome;
    }

    @PrePersist
    protected void aoCriar() {
        criadoEm = Instant.now();
    }
}

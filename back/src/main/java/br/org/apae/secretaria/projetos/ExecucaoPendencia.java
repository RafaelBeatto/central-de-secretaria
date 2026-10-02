package br.org.apae.secretaria.projetos;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Algo a resolver na execução que não é etapa do processo. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "execucao_pendencia", schema = "projetos")
public class ExecucaoPendencia extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(nullable = false, length = Limites.PENDENCIA_TITULO, updatable = false)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private Prioridade prioridade;

    @Column(length = Limites.PENDENCIA_DESCRICAO, updatable = false)
    private String descricao;

    @Setter
    @Column(nullable = false)
    private boolean concluida;

    public ExecucaoPendencia(Long execucaoId, String titulo, Prioridade prioridade, String descricao) {
        this.execucaoId = execucaoId;
        this.titulo = titulo;
        this.prioridade = prioridade;
        this.descricao = descricao;
    }
}

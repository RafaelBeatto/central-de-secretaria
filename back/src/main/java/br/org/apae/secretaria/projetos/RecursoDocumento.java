package br.org.apae.secretaria.projetos;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Documento do recurso inteiro (termo, convênio, plano geral…). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "recurso_documento", schema = "projetos")
public class RecursoDocumento extends EntidadeBase {

    @Column(name = "recurso_id", nullable = false, updatable = false)
    private Long recursoId;

    @Column(nullable = false, length = Limites.RECURSO_DOCUMENTO_NOME, updatable = false)
    private String nome;

    @Column(length = Limites.PROJETO_OBSERVACAO, updatable = false)
    private String observacao;

    @Column(nullable = false, updatable = false)
    private LocalDate data;

    @Column(name = "arquivo_id", nullable = false, updatable = false)
    private Long arquivoId;

    public RecursoDocumento(Long recursoId, String nome, String observacao, LocalDate data, Long arquivoId) {
        this.recursoId = recursoId;
        this.nome = nome;
        this.observacao = observacao;
        this.data = data;
        this.arquivoId = arquivoId;
    }
}

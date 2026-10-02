package br.org.apae.secretaria.projetos;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import br.org.apae.secretaria.projetos.Enums.CategoriaDocumentoExecucao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Nota fiscal, comprovante, relatório ou declaração da execução. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "execucao_documento", schema = "projetos")
public class ExecucaoDocumento extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(nullable = false, length = Limites.EXECUCAO_DOCUMENTO_NOME, updatable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15, updatable = false)
    private CategoriaDocumentoExecucao categoria;

    @Column(updatable = false)
    private LocalDate data;

    @Column(name = "arquivo_id", nullable = false, updatable = false)
    private Long arquivoId;

    public ExecucaoDocumento(Long execucaoId, String nome, CategoriaDocumentoExecucao categoria, LocalDate data, Long arquivoId) {
        this.execucaoId = execucaoId;
        this.nome = nome;
        this.categoria = categoria;
        this.data = data;
        this.arquivoId = arquivoId;
    }
}

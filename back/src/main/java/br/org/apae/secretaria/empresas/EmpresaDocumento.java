package br.org.apae.secretaria.empresas;

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

/**
 * Documento anexado à ficha de uma empresa (CNPJ, Contrato Social, CNDs…).
 * O nome vem de uma lista de sugestões no front, mas fica livre como no antigo.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "empresa_documento", schema = "empresas")
public class EmpresaDocumento extends EntidadeBase {

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(nullable = false, length = Limites.EMPRESA_DOCUMENTO_NOME)
    private String nome;

    @Column(name = "data_validade")
    private LocalDate dataValidade;

    @Column(length = Limites.EMPRESA_DOCUMENTO_OBSERVACAO)
    private String observacao;

    @Column(name = "arquivo_id", nullable = false)
    private Long arquivoId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    public EmpresaDocumento(Long empresaId, String nome, LocalDate dataValidade, String observacao, Long arquivoId) {
        this.empresaId = empresaId;
        this.nome = nome;
        this.dataValidade = dataValidade;
        this.observacao = observacao;
        this.arquivoId = arquivoId;
    }

    @PrePersist
    protected void aoCriar() {
        criadoEm = Instant.now();
    }
}

package br.org.apae.secretaria.projetos;

import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Empresa ligada a uma execução (o cadastro continua único em Empresas). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "execucao_empresa", schema = "projetos")
public class ExecucaoEmpresa extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    public ExecucaoEmpresa(Long execucaoId, Long empresaId) {
        this.execucaoId = execucaoId;
        this.empresaId = empresaId;
    }
}

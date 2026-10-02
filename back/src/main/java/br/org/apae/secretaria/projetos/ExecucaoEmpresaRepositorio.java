package br.org.apae.secretaria.projetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExecucaoEmpresaRepositorio extends JpaRepository<ExecucaoEmpresa, Long> {
    List<ExecucaoEmpresa> findByExecucaoIdOrderByCriadoEmAsc(Long execucaoId);

    boolean existsByExecucaoIdAndEmpresaId(Long execucaoId, Long empresaId);

    List<ExecucaoEmpresa> findByExecucaoIdIn(Collection<Long> execucaoIds);
}

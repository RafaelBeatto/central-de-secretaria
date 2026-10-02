package br.org.apae.secretaria.projetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExecucaoDocumentoRepositorio extends JpaRepository<ExecucaoDocumento, Long> {
    List<ExecucaoDocumento> findByExecucaoIdOrderByDataDescIdDesc(Long execucaoId);

    List<ExecucaoDocumento> findByExecucaoIdIn(Collection<Long> execucaoIds);
}

package br.org.apae.secretaria.projetos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExecucaoPendenciaRepositorio extends JpaRepository<ExecucaoPendencia, Long> {
    List<ExecucaoPendencia> findByExecucaoIdOrderByConcluidaAscCriadoEmAsc(Long execucaoId);
}

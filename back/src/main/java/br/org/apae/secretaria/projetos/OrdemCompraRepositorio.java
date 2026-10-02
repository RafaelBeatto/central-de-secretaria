package br.org.apae.secretaria.projetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrdemCompraRepositorio extends JpaRepository<OrdemCompra, Long> {
    List<OrdemCompra> findByExecucaoIdOrderByCriadoEmAsc(Long execucaoId);

    List<OrdemCompra> findByCotacaoIdIn(Collection<Long> cotacaoIds);

    boolean existsByCotacaoId(Long cotacaoId);

    List<OrdemCompra> findByExecucaoIdIn(Collection<Long> execucaoIds);
}

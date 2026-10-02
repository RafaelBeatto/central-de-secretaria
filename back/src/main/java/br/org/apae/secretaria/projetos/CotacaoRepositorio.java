package br.org.apae.secretaria.projetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CotacaoRepositorio extends JpaRepository<Cotacao, Long> {
    List<Cotacao> findByExecucaoIdOrderByDataAscIdAsc(Long execucaoId);

    List<Cotacao> findByEmpresaIdOrderByDataDesc(Long empresaId);

    List<Cotacao> findByExecucaoIdIn(Collection<Long> execucaoIds);
}

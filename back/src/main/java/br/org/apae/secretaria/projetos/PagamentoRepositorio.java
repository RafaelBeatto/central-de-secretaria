package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PagamentoRepositorio extends JpaRepository<Pagamento, Long> {
    List<Pagamento> findByExecucaoIdOrderByDataDescIdDesc(Long execucaoId);

    @Query("select coalesce(sum(p.valor), 0) from Pagamento p where p.execucaoId = :execucaoId")
    BigDecimal totalDa(Long execucaoId);

    /** [execucaoId, total pago] de várias execuções numa consulta só. */
    @Query("select p.execucaoId, sum(p.valor) from Pagamento p where p.execucaoId in :ids group by p.execucaoId")
    List<Object[]> totaisPorExecucao(Collection<Long> ids);
}

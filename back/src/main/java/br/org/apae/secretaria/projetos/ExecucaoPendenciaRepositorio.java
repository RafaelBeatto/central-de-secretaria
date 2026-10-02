package br.org.apae.secretaria.projetos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExecucaoPendenciaRepositorio extends JpaRepository<ExecucaoPendencia, Long> {
    List<ExecucaoPendencia> findByExecucaoIdOrderByConcluidaAscCriadoEmAsc(Long execucaoId);

    /** Painel: pendências em aberto das execuções vivas (não concluídas/canceladas) de recursos não arquivados. */
    @Query("""
            select p from ExecucaoPendencia p
             where p.concluida = false
               and p.execucaoId in (select e.id from Execucao e
                                     where e.unidadeId = :unidadeId and e.status not in :encerradas
                                       and e.recursoId in (select r.id from Recurso r
                                                            where r.unidadeId = :unidadeId and r.arquivado = false))
             order by p.criadoEm
            """)
    List<ExecucaoPendencia> abertas(Long unidadeId, java.util.Collection<Enums.StatusExecucao> encerradas);
}

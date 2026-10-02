package br.org.apae.secretaria.projetos;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExecucaoRepositorio extends JpaRepository<Execucao, Long> {
    List<Execucao> findByUnidadeId(Long unidadeId);
    List<Execucao> findByRecursoIdOrderByDataInicioAscIdAsc(Long recursoId);

    List<Execucao> findByRecursoIdIn(Collection<Long> recursoIds);

    boolean existsByRecursoId(Long recursoId);

    @Query("""
            select e from Execucao e where e.unidadeId = :unidadeId
               and e.recursoId in (select r.id from Recurso r where r.arquivado = false)
               and ((e.dataInicio between :inicio and :fim) or (e.dataFim between :inicio and :fim))
            """)
    List<Execucao> deRecursosAtivosComDataNoPeriodo(Long unidadeId, LocalDate inicio, LocalDate fim);

    @Query("""
            select e from Execucao e where e.unidadeId = :unidadeId
               and e.recursoId in (select r.id from Recurso r where r.arquivado = false)
            """)
    List<Execucao> deRecursosAtivos(Long unidadeId);

    @Query("select e from Execucao e where e.id in (select v.execucaoId from ExecucaoEmpresa v where v.empresaId = :empresaId)")
    List<Execucao> daEmpresa(Long empresaId);
}

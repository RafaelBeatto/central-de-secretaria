package br.org.apae.secretaria.tarefas;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TarefaRepositorio extends JpaRepository<Tarefa, Long> {

    List<Tarefa> findByUnidadeId(Long unidadeId);

    /** Tarefas em aberto (inclui rotinas ativas) + as concluídas a partir de uma data. */
    @Query("""
            select distinct t from Tarefa t left join fetch t.subtarefas
             where t.unidadeId = :unidadeId
               and (t.status not in :encerradas or t.dataConclusao >= :concluidasDesde)
            """)
    List<Tarefa> ativas(Long unidadeId, Collection<StatusTarefa> encerradas, LocalDate concluidasDesde);

    /** Concluídas e canceladas mais recentes (seção recolhida da Secretaria / "ver todas" do Kanban). */
    @Query("""
            select t from Tarefa t
             where t.unidadeId = :unidadeId and t.status in :encerradas
             order by t.atualizadoEm desc
            """)
    List<Tarefa> encerradas(Long unidadeId, Collection<StatusTarefa> encerradas, Pageable limite);

    @Query("""
            select distinct t.responsavel from Tarefa t
             where t.unidadeId = :unidadeId and t.responsavel is not null
             order by t.responsavel
            """)
    List<String> responsaveis(Long unidadeId);

    @Query("""
            select distinct t.categoria from Tarefa t
             where t.unidadeId = :unidadeId and t.categoria is not null
             order by t.categoria
            """)
    List<String> categorias(Long unidadeId);

    /** Agenda: tarefas cujo prazo (ou a próxima vez, na rotina) cai no período. */
    @Query("""
            select t from Tarefa t
             where t.unidadeId = :unidadeId and t.status <> :cancelada
               and ((t.frequencia is null and t.prazo between :inicio and :fim)
                 or (t.frequencia is not null and t.proxima between :inicio and :fim))
            """)
    List<Tarefa> comPrazoNoPeriodo(Long unidadeId, StatusTarefa cancelada, LocalDate inicio, LocalDate fim);
}

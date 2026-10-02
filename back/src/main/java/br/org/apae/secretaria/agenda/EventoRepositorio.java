package br.org.apae.secretaria.agenda;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EventoRepositorio extends JpaRepository<Evento, Long> {

    List<Evento> findByUnidadeId(Long unidadeId);

    /** Eventos de um período (tarefa ligada e série já carregadas). */
    @Query("""
            select e from Evento e left join fetch e.tarefa left join fetch e.serie
             where e.unidadeId = :unidadeId and e.data between :inicio and :fim
            """)
    List<Evento> doPeriodo(Long unidadeId, LocalDate inicio, LocalDate fim);

    /** Todas as datas de uma série, em ordem. */
    @Query("select e from Evento e where e.serie.id = :serieId order by e.data, e.id")
    List<Evento> daSerie(Long serieId);

    long countBySerieId(Long serieId);
}

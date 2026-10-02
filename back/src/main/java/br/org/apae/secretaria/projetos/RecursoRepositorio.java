package br.org.apae.secretaria.projetos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RecursoRepositorio extends JpaRepository<Recurso, Long> {
    List<Recurso> findByUnidadeIdOrderByDataInicioDescIdDesc(Long unidadeId);

    @Query("""
            select r from Recurso r where r.unidadeId = :unidadeId and r.arquivado = false
               and ((r.dataInicio between :inicio and :fim) or (r.dataFim between :inicio and :fim))
            """)
    List<Recurso> ativosComDataNoPeriodo(Long unidadeId, LocalDate inicio, LocalDate fim);
}

package br.org.apae.secretaria.documentos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepositorio extends JpaRepository<Documento, Long> {

    List<Documento> findByUnidadeIdOrderByNomeAsc(Long unidadeId);

    /** Vencimentos no período (fonte da Agenda). */
    List<Documento> findByUnidadeIdAndDataValidadeBetween(Long unidadeId, LocalDate inicio, LocalDate fim);
}

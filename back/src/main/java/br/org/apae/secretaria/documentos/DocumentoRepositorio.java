package br.org.apae.secretaria.documentos;

<<<<<<< HEAD
import java.time.LocalDate;
=======
>>>>>>> 426a94c127d17a98c09e288f8ca7b11985d0744f
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepositorio extends JpaRepository<Documento, Long> {

    List<Documento> findByUnidadeIdOrderByNomeAsc(Long unidadeId);
<<<<<<< HEAD

    /** Vencimentos no período (fonte da Agenda). */
    List<Documento> findByUnidadeIdAndDataValidadeBetween(Long unidadeId, LocalDate inicio, LocalDate fim);
=======
>>>>>>> 426a94c127d17a98c09e288f8ca7b11985d0744f
}

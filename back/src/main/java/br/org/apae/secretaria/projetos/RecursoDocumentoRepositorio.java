package br.org.apae.secretaria.projetos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecursoDocumentoRepositorio extends JpaRepository<RecursoDocumento, Long> {
    List<RecursoDocumento> findByRecursoIdOrderByDataDescIdDesc(Long recursoId);
}

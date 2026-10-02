package br.org.apae.secretaria.gerador;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ModeloDocumentoRepositorio extends JpaRepository<ModeloDocumento, Long> {

    /** Modelos do sistema (unidade nula) e os da unidade. */
    List<ModeloDocumento> findByUnidadeIdIsNullOrUnidadeIdOrderByNomeAsc(Long unidadeId);
}

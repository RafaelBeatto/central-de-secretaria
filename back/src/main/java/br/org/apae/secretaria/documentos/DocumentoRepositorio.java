package br.org.apae.secretaria.documentos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepositorio extends JpaRepository<Documento, Long> {

    List<Documento> findByUnidadeIdOrderByNomeAsc(Long unidadeId);
}

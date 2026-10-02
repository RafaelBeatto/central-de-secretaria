package br.org.apae.secretaria.documentos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoVersaoRepositorio extends JpaRepository<DocumentoVersao, Long> {

    List<DocumentoVersao> findByDocumentoIdOrderBySubstituidaEmDesc(Long documentoId);
}

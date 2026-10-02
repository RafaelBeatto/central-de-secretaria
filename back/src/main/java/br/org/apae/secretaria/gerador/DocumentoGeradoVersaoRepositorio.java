package br.org.apae.secretaria.gerador;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoGeradoVersaoRepositorio extends JpaRepository<DocumentoGeradoVersao, Long> {

    List<DocumentoGeradoVersao> findByDocumentoGeradoIdOrderByVersaoDesc(Long documentoGeradoId);
}

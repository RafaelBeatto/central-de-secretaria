package br.org.apae.secretaria.documentos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoVersaoRepositorio extends JpaRepository<DocumentoVersao, Long> {

    List<DocumentoVersao> findByDocumentoIdOrderBySubstituidaEmDesc(Long documentoId);

    /** Relatório: renovações da unidade no intervalo [de, ate) — nome, quando e a validade atual do documento. */
    @org.springframework.data.jpa.repository.Query("""
            select d.nome, v.substituidaEm, d.dataValidade from DocumentoVersao v join Documento d on d.id = v.documentoId
             where d.unidadeId = :unidadeId and v.substituidaEm >= :de and v.substituidaEm < :ate
             order by v.substituidaEm
            """)
    List<Object[]> renovacoes(Long unidadeId, java.time.Instant de, java.time.Instant ate);
}

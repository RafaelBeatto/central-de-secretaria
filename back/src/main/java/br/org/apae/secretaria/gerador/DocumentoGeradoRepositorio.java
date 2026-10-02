package br.org.apae.secretaria.gerador;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentoGeradoRepositorio extends JpaRepository<DocumentoGerado, Long> {

    List<DocumentoGerado> findByUnidadeIdOrderByDataGeracaoDescIdDesc(Long unidadeId);

    boolean existsByUnidadeIdAndVinculoTipoAndVinculoId(Long unidadeId, TipoVinculo tipo, Long id);

    /** Quantos documentos cada modelo gerou na unidade (o antigo mostrava os mais usados primeiro). */
    @Query("select d.modeloId, count(d) from DocumentoGerado d "
            + "where d.unidadeId = :unidade and d.modeloId is not null group by d.modeloId")
    List<Object[]> usosPorModelo(@Param("unidade") Long unidade);
}

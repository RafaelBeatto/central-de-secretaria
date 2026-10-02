package br.org.apae.secretaria.vinculos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface VinculoRegistroRepositorio extends JpaRepository<VinculoRegistro, Long> {

    /** Vínculos de um registro, não importa de que lado do par ele ficou. */
    @Query("""
            select v from VinculoRegistro v
             where (v.origemTipo = :tipo and v.origemId = :id) or (v.destinoTipo = :tipo and v.destinoId = :id)
             order by v.criadoEm
            """)
    List<VinculoRegistro> doRegistro(TipoRegistro tipo, Long id);

    boolean existsByOrigemTipoAndOrigemIdAndDestinoTipoAndDestinoId(TipoRegistro origemTipo, Long origemId,
            TipoRegistro destinoTipo, Long destinoId);

    /** Ao excluir um registro, somem os vínculos dele. */
    @Modifying
    @Query("""
            delete from VinculoRegistro v
             where (v.origemTipo = :tipo and v.origemId = :id) or (v.destinoTipo = :tipo and v.destinoId = :id)
            """)
    void apagarDoRegistro(TipoRegistro tipo, Long id);
}

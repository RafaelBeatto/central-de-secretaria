package br.org.apae.secretaria.vinculos;

import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Vínculo livre entre dois registros (old/js/12-relacionamentos.js). O par é gravado sempre na mesma ordem
 * (menor tipo, depois menor id, vira a "origem"), então A↔B e B↔A são o mesmo vínculo.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "vinculo_registro", schema = "sistema")
public class VinculoRegistro extends EntidadeCriada {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_tipo", nullable = false, length = 15, updatable = false)
    private TipoRegistro origemTipo;

    @Column(name = "origem_id", nullable = false, updatable = false)
    private Long origemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "destino_tipo", nullable = false, length = 15, updatable = false)
    private TipoRegistro destinoTipo;

    @Column(name = "destino_id", nullable = false, updatable = false)
    private Long destinoId;

    /** Ordena o par e devolve o vínculo pronto para gravar. */
    public static VinculoRegistro entre(Long unidadeId, TipoRegistro tipoA, Long idA, TipoRegistro tipoB, Long idB) {
        boolean aPrimeiro = tipoA.compareTo(tipoB) < 0 || (tipoA == tipoB && idA <= idB);
        VinculoRegistro v = new VinculoRegistro();
        v.unidadeId = unidadeId;
        v.origemTipo = aPrimeiro ? tipoA : tipoB;
        v.origemId = aPrimeiro ? idA : idB;
        v.destinoTipo = aPrimeiro ? tipoB : tipoA;
        v.destinoId = aPrimeiro ? idB : idA;
        return v;
    }

    /** O outro lado do vínculo, visto de um dos registros. */
    public boolean deste(TipoRegistro tipo, Long id) {
        return (origemTipo == tipo && origemId.equals(id)) || (destinoTipo == tipo && destinoId.equals(id));
    }
}

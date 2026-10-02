package br.org.apae.secretaria.gerador;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Modelo de documento (old/js/17-gerador-documentos.js). {@code unidadeId == null} é modelo do sistema:
 * todas as unidades usam e duplicam, mas só a unidade dona edita/exclui os seus.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "modelo_documento", schema = "gerador")
public class ModeloDocumento extends EntidadeAuditavel {

    /** Texto do modelo que liga a numeração automática por série e ano. */
    public static final String CAMPO_NUMERO = "{NUMERO}";

    @Column(name = "unidade_id", updatable = false)
    private Long unidadeId;

    @Column(nullable = false, length = Limites.GERADOR_MODELO_NOME)
    private String nome;

    @Column(length = Limites.GERADOR_TITULO)
    private String titulo;

    @Column(length = Limites.GERADOR_SERIE)
    private String serie;

    @Column(nullable = false, length = Limites.GERADOR_TEXTO)
    private String texto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private FormatoModelo formato;

    @Column(length = Limites.GERADOR_ESPACAMENTO)
    private String espacamento;

    public ModeloDocumento(Long unidadeId, String nome, String titulo, String serie, String texto,
            FormatoModelo formato, String espacamento) {
        this.unidadeId = unidadeId;
        this.formato = formato;
        alterar(nome, titulo, serie, texto, espacamento);
    }

    public void alterar(String nome, String titulo, String serie, String texto, String espacamento) {
        this.nome = nome;
        this.titulo = titulo;
        this.serie = serie;
        this.texto = texto;
        this.espacamento = espacamento;
    }

    public boolean doSistema() {
        return unidadeId == null;
    }

    /** Série da numeração: a informada ou, na falta, o nome do modelo (como no antigo). */
    public String serieEfetiva() {
        String efetiva = serie != null ? serie : nome;
        return efetiva.length() > Limites.GERADOR_SERIE ? efetiva.substring(0, Limites.GERADOR_SERIE) : efetiva;
    }

    /** Regra do antigo: o modelo é numerado quando o texto usa o campo automático {NUMERO}. */
    public boolean usaNumeracao() {
        return texto.contains(CAMPO_NUMERO);
    }
}

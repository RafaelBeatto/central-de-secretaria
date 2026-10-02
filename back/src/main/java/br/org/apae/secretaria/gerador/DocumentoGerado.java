package br.org.apae.secretaria.gerador;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Documento gerado a partir de um modelo. Guarda uma cópia do texto do modelo (editar ou excluir o modelo
 * não muda o documento) e, a cada edição, empilha a versão anterior em {@link DocumentoGeradoVersao}.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "documento_gerado", schema = "gerador")
public class DocumentoGerado extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(name = "modelo_id")
    private Long modeloId;

    @Column(name = "modelo_nome", nullable = false, length = Limites.GERADOR_MODELO_NOME, updatable = false)
    private String modeloNome;

    @Column(length = Limites.GERADOR_SERIE, updatable = false)
    private String serie;

    @Column(length = Limites.GERADOR_TITULO, updatable = false)
    private String titulo;

    @Column(length = Limites.GERADOR_NUMERO, updatable = false)
    private String numero;

    @Column(name = "texto_snapshot", nullable = false, length = Limites.GERADOR_TEXTO, updatable = false)
    private String textoSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5, updatable = false)
    private FormatoModelo formato;

    @Column(length = Limites.GERADOR_ESPACAMENTO, updatable = false)
    private String espacamento;

    @Column(name = "data_geracao", nullable = false, updatable = false)
    private LocalDate dataGeracao;

    @Column(nullable = false)
    private int versao = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "vinculo_tipo", length = 15)
    private TipoVinculo vinculoTipo;

    @Column(name = "vinculo_id")
    private Long vinculoId;

    @Column(name = "vinculo_rotulo", length = Limites.GERADOR_VINCULO_ROTULO)
    private String vinculoRotulo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, String> valores = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, String> contexto = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<List<String>> assinaturas = new ArrayList<>();

    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "documento_gerado_anexo", schema = "gerador",
            joinColumns = @JoinColumn(name = "documento_gerado_id"))
    @Column(name = "arquivo_id")
    private Set<Long> anexos = new HashSet<>();

    public DocumentoGerado(Long unidadeId, ModeloDocumento modelo, String numero, LocalDate dataGeracao,
            Long criadoPorId) {
        this(unidadeId, modelo.getId(), modelo.getNome(), modelo.serieEfetiva(),
                modelo.getTitulo() != null ? modelo.getTitulo() : modelo.getNome(), numero, modelo.getTexto(),
                modelo.getFormato(), modelo.getEspacamento(), dataGeracao, criadoPorId);
    }

    /** Cópia de um documento existente: usa o texto do próprio documento, não o do modelo (que pode ter mudado). */
    public DocumentoGerado(Long unidadeId, DocumentoGerado original, String numero, LocalDate dataGeracao,
            Long criadoPorId) {
        this(unidadeId, original.modeloId, original.modeloNome, original.serie, original.titulo, numero,
                original.textoSnapshot, original.formato, original.espacamento, dataGeracao, criadoPorId);
        preencher(original.valores, original.contexto, original.assinaturas);
        ligarA(original.vinculoTipo, original.vinculoId, original.vinculoRotulo);
    }

    private DocumentoGerado(Long unidadeId, Long modeloId, String modeloNome, String serie, String titulo,
            String numero, String textoSnapshot, FormatoModelo formato, String espacamento, LocalDate dataGeracao,
            Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.modeloId = modeloId;
        this.modeloNome = modeloNome;
        this.serie = serie;
        this.titulo = titulo;
        this.numero = numero;
        this.textoSnapshot = textoSnapshot;
        this.formato = formato;
        this.espacamento = espacamento;
        this.dataGeracao = dataGeracao;
        this.criadoPorId = criadoPorId;
    }

    public final void preencher(Map<String, String> valores, Map<String, String> contexto,
            List<List<String>> assinaturas) {
        this.valores = new HashMap<>(valores);
        this.contexto = new HashMap<>(contexto);
        this.assinaturas = assinaturas.stream().<List<String>>map(ArrayList::new).collect(Collectors.toList());
    }

    public final void ligarA(TipoVinculo tipo, Long id, String rotulo) {
        this.vinculoTipo = tipo;
        this.vinculoId = id;
        this.vinculoRotulo = rotulo;
    }

    /**
     * Salva as novas respostas como a próxima versão: devolve o estado atual para ser guardado
     * como versão anterior.
     */
    public DocumentoGeradoVersao editar(Map<String, String> valores, Map<String, String> contexto,
            List<List<String>> assinaturas, Instant salvoAnteriormenteEm) {
        DocumentoGeradoVersao anterior = new DocumentoGeradoVersao(this, salvoAnteriormenteEm);
        preencher(valores, contexto, assinaturas);
        versao++;
        return anterior;
    }

    public String nomeExibido() {
        return numero == null ? modeloNome : "%s nº %s".formatted(modeloNome, numero);
    }

    public void anexar(Long arquivoId) {
        anexos.add(arquivoId);
    }

    public boolean removerAnexo(Long arquivoId) {
        return anexos.remove(arquivoId);
    }
}

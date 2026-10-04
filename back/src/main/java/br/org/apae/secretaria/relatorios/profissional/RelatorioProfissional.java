package br.org.apae.secretaria.relatorios.profissional;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Relatório em PDF entregue por um professor/profissional. O sistema só arquiva o arquivo;
 * nome e cargo são o retrato do momento do envio.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "relatorio_profissional", schema = "relatorios")
public class RelatorioProfissional extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "nome_usuario", nullable = false, length = Limites.RELATORIO_PROF_NOME, updatable = false)
    private String nomeUsuario;

    @Column(name = "cargo_nome", nullable = false, length = Limites.RELATORIO_PROF_CARGO, updatable = false)
    private String cargoNome;

    @Column(nullable = false, length = Limites.RELATORIO_PROF_TITULO, updatable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private TipoRelatorio tipo;

    @Column(name = "nome_aluno", length = Limites.RELATORIO_PROF_ALUNO, updatable = false)
    private String nomeAluno;

    @Column(length = Limites.RELATORIO_PROF_COMPLEMENTO, updatable = false)
    private String complemento;

    @Column(name = "periodo_inicio", nullable = false)
    private LocalDate periodoInicio;

    @Column(name = "periodo_fim", nullable = false)
    private LocalDate periodoFim;

    @Column(name = "arquivo_id")
    private Long arquivoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusRelatorio status;

    @Column(name = "solicitado_por_id", updatable = false)
    private Long solicitadoPorId;

    @Column(name = "solicitado_em", updatable = false)
    private Instant solicitadoEm;

    /** Nulo enquanto o relatório está pendente. */
    @Column(name = "enviado_em")
    private Instant enviadoEm;

    /** Relatório entregue: nasce com o arquivo e o status Entregue. */
    public RelatorioProfissional(Long unidadeId, Long usuarioId, String nomeUsuario, String cargoNome,
            String nome, TipoRelatorio tipo, String nomeAluno, String complemento, LocalDate periodoInicio,
            LocalDate periodoFim, Long arquivoId) {
        this.unidadeId = unidadeId;
        this.usuarioId = usuarioId;
        this.nomeUsuario = nomeUsuario;
        this.cargoNome = cargoNome;
        this.nome = nome;
        this.tipo = tipo;
        this.nomeAluno = nomeAluno;
        this.complemento = complemento;
        this.periodoInicio = periodoInicio;
        this.periodoFim = periodoFim;
        this.arquivoId = arquivoId;
        this.status = StatusRelatorio.ENTREGUE;
        this.enviadoEm = Instant.now();
    }

    /** Cobrança: pendente, sem arquivo; o período (a data de hoje) só vale até a entrega. */
    public static RelatorioProfissional cobranca(Long unidadeId, Long usuarioId, String nomeUsuario, String cargoNome,
            String nome, TipoRelatorio tipo, String nomeAluno, String complemento, LocalDate hoje, Long solicitadoPorId) {
        RelatorioProfissional r = new RelatorioProfissional(unidadeId, usuarioId, nomeUsuario, cargoNome, nome, tipo,
                nomeAluno, complemento, hoje, hoje, null);
        r.status = StatusRelatorio.PENDENTE;
        r.enviadoEm = null;
        r.solicitadoPorId = solicitadoPorId;
        r.solicitadoEm = Instant.now();
        return r;
    }

    public boolean pendente() {
        return status == StatusRelatorio.PENDENTE;
    }

    /** O profissional atende à cobrança enviando o PDF. */
    public void entregar(Long arquivoId, LocalDate periodoInicio, LocalDate periodoFim) {
        this.arquivoId = arquivoId;
        this.periodoInicio = periodoInicio;
        this.periodoFim = periodoFim;
        this.status = StatusRelatorio.ENTREGUE;
        this.enviadoEm = Instant.now();
    }
}

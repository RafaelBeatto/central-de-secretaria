package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import br.org.apae.secretaria.documentos.Documento;
import br.org.apae.secretaria.documentos.DocumentoRepositorio;
import br.org.apae.secretaria.documentos.ExigenciaApae;
import br.org.apae.secretaria.empresas.EmpresaDocumento;
import br.org.apae.secretaria.empresas.EmpresaDocumentoRepositorio;
import br.org.apae.secretaria.projetos.Enums.CategoriaDocumentoExecucao;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.DocumentoApae;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.Etapa;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoResumo;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.FinanceiroRecurso;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.SituacaoExecucao;
import lombok.RequiredArgsConstructor;

/**
 * Números e checklist dos projetos, iguais ao antigo (old/js/04-projetos.js: recursoResumoFinanceiro,
 * execucaoFinanceiro, projectChecklist, situacaoDocsApae, statusDocumentacaoEmpresa). Tudo é carregado em
 * lote para a lista de recursos não fazer uma consulta por execução.
 */
@Component
@RequiredArgsConstructor
public class CalculoProjetos {

    private final PagamentoRepositorio pagamentos;
    private final CotacaoRepositorio cotacoes;
    private final OrdemCompraRepositorio ordens;
    private final ExecucaoEmpresaRepositorio vinculos;
    private final ExecucaoDocumentoRepositorio documentos;
    private final DocumentoRepositorio documentosApae;
    private final EmpresaDocumentoRepositorio documentosEmpresa;

    /** Total pago por execução (as sem pagamento ficam com zero). */
    public Map<Long, BigDecimal> pagos(List<Execucao> execucoes) {
        Map<Long, BigDecimal> totais = execucoes.isEmpty() ? Map.of()
                : pagamentos.totaisPorExecucao(ids(execucoes)).stream()
                        .collect(Collectors.toMap(l -> (Long) l[0], l -> (BigDecimal) l[1]));
        return execucoes.stream().collect(Collectors.toMap(Execucao::getId, e -> totais.getOrDefault(e.getId(), BigDecimal.ZERO)));
    }

    public FinanceiroRecurso financeiro(Recurso recurso, List<Execucao> execucoes, Map<Long, BigDecimal> pagos) {
        List<Execucao> ativas = execucoes.stream().filter(e -> !e.cancelada()).toList();
        BigDecimal recebido = recurso.getValorRecebido();
        BigDecimal distribuido = soma(ativas.stream().map(Execucao::getValorPlanejado).toList());
        BigDecimal pago = soma(ativas.stream().map(e -> pagos.getOrDefault(e.getId(), BigDecimal.ZERO)).toList());
        BigDecimal naoDistribuido = recebido.subtract(distribuido);
        BigDecimal saldoExecucoes = distribuido.subtract(pago);
        return new FinanceiroRecurso(recebido, distribuido, pago, naoDistribuido, saldoExecucoes,
                naoDistribuido.add(saldoExecucoes), percentual(distribuido, recebido), percentual(pago, distribuido));
    }

    /** Valor ainda livre no recurso para execuções (canceladas e a própria execução, ao editar, não contam). */
    public BigDecimal livreParaDistribuir(Recurso recurso, List<Execucao> execucoes, Long ignorarExecucaoId) {
        return recurso.getValorRecebido().subtract(soma(execucoes.stream()
                .filter(e -> !e.cancelada() && !e.getId().equals(ignorarExecucaoId))
                .map(Execucao::getValorPlanejado).toList()));
    }

    public List<ExecucaoResumo> resumos(List<Execucao> execucoes, Map<Long, String> nomesRecursos, Long unidadeId,
            LocalDate hoje) {
        Map<Long, SituacaoExecucao> situacoes = situacoes(execucoes, unidadeId, hoje);
        return execucoes.stream().map(e -> new ExecucaoResumo(e.getId(), e.getRecursoId(),
                nomesRecursos.get(e.getRecursoId()), e.getCodigo(), e.getNome(), e.getStatus(), e.getResponsavel(),
                e.getDataInicio(), e.getDataFim(), situacoes.get(e.getId()))).toList();
    }

    public Map<Long, SituacaoExecucao> situacoes(List<Execucao> execucoes, Long unidadeId, LocalDate hoje) {
        if (execucoes.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = ids(execucoes);
        Map<Long, BigDecimal> pagos = pagos(execucoes);
        Map<Long, Long> empresasCotadas = cotacoes.findByExecucaoIdIn(ids).stream()
                .collect(Collectors.groupingBy(Cotacao::getExecucaoId,
                        Collectors.collectingAndThen(Collectors.mapping(Cotacao::getEmpresaId, Collectors.toSet()),
                                s -> (long) s.size())));
        Set<Long> comOrdem = ordens.findByExecucaoIdIn(ids).stream().map(OrdemCompra::getExecucaoId).collect(Collectors.toSet());
        Set<Long> comNota = documentos.findByExecucaoIdIn(ids).stream()
                .filter(d -> d.getCategoria() == CategoriaDocumentoExecucao.NOTA_FISCAL)
                .map(ExecucaoDocumento::getExecucaoId).collect(Collectors.toSet());
        Map<Long, List<Long>> empresasPorExecucao = vinculos.findByExecucaoIdIn(ids).stream()
                .collect(Collectors.groupingBy(ExecucaoEmpresa::getExecucaoId,
                        Collectors.mapping(ExecucaoEmpresa::getEmpresaId, Collectors.toList())));
        Set<Long> empresasOk = empresasComDocumentacaoOk(
                empresasPorExecucao.values().stream().flatMap(List::stream).distinct().toList(), hoje);
        boolean apaeOk = documentacaoApae(unidadeId, hoje).stream().allMatch(DocumentoApae::ok);

        return execucoes.stream().collect(Collectors.toMap(Execucao::getId, e -> {
            List<Long> empresas = empresasPorExecucao.getOrDefault(e.getId(), List.of());
            List<Etapa> etapas = List.of(
                    new Etapa("Plano de aplicação / trabalho", e.getPlanoDescricao() != null || e.getPlanoArquivoId() != null, "plano"),
                    new Etapa("Cotações de 3 empresas", empresasCotadas.getOrDefault(e.getId(), 0L) >= 3, "empresas"),
                    new Etapa("Ordem de compra", comOrdem.contains(e.getId()), "empresas"),
                    new Etapa("Documentação da APAE", apaeOk, "docs-apae"),
                    new Etapa("Documentação das empresas", !empresas.isEmpty() && empresasOk.containsAll(empresas), "empresas"),
                    new Etapa("Nota fiscal / comprovante", comNota.contains(e.getId()), "documentos"),
                    new Etapa("Pagamento registrado", pagos.get(e.getId()).signum() > 0, "pagamentos"));
            BigDecimal pago = pagos.get(e.getId());
            return new SituacaoExecucao(e.getValorPlanejado(), pago, e.getValorPlanejado().subtract(pago),
                    percentual(pago, e.getValorPlanejado()), etapas, (int) etapas.stream().filter(Etapa::ok).count(),
                    etapas.stream().filter(x -> !x.ok()).findFirst().orElse(null));
        }));
    }

    /** Empresas com documentos na ficha e nenhum vencido (old: statusDocumentacaoEmpresa = 🟢). */
    public Set<Long> empresasComDocumentacaoOk(List<Long> empresaIds, LocalDate hoje) {
        if (empresaIds.isEmpty()) {
            return Set.of();
        }
        Map<Long, List<EmpresaDocumento>> porEmpresa = documentosEmpresa.findByEmpresaIdInOrderByNomeAsc(empresaIds)
                .stream().collect(Collectors.groupingBy(EmpresaDocumento::getEmpresaId));
        return porEmpresa.entrySet().stream()
                .filter(x -> x.getValue().stream().noneMatch(d -> d.getDataValidade() != null && d.getDataValidade().isBefore(hoje)))
                .map(Map.Entry::getKey).collect(Collectors.toSet());
    }

    /** Para cada exigência, o documento de validade mais longa (sem validade conta como válido). */
    public List<DocumentoApae> documentacaoApae(Long unidadeId, LocalDate hoje) {
        Map<ExigenciaApae, Documento> melhor = documentosApae.findByUnidadeIdAndExigenciaApaeIsNotNull(unidadeId).stream()
                .collect(Collectors.toMap(Documento::getExigenciaApae, Function.identity(),
                        (a, b) -> Comparator.comparing(CalculoProjetos::validadeOuInfinito).compare(a, b) >= 0 ? a : b));
        return Arrays.stream(ExigenciaApae.values()).map(exigencia -> {
            Documento d = melhor.get(exigencia);
            if (d == null) {
                return new DocumentoApae(exigencia, null, null, null, null, false);
            }
            boolean ok = d.getDataValidade() == null || !d.getDataValidade().isBefore(hoje);
            return new DocumentoApae(exigencia, d.getId(), d.getNome(), d.getDataValidade(), d.getArquivoId(), ok);
        }).toList();
    }

    private static LocalDate validadeOuInfinito(Documento d) {
        return Objects.requireNonNullElse(d.getDataValidade(), LocalDate.MAX);
    }

    private static List<Long> ids(List<Execucao> execucoes) {
        return execucoes.stream().map(Execucao::getId).toList();
    }

    private static BigDecimal soma(List<BigDecimal> valores) {
        return valores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static int percentual(BigDecimal parte, BigDecimal total) {
        return total.signum() <= 0 ? 0
                : parte.multiply(BigDecimal.valueOf(100)).divide(total, 0, RoundingMode.HALF_UP).intValue();
    }
}

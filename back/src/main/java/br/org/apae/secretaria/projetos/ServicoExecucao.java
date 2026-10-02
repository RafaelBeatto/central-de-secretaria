package br.org.apae.secretaria.projetos;

import static br.org.apae.secretaria.projetos.ServicoRecurso.moeda;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.empresas.Empresa;
import br.org.apae.secretaria.empresas.EmpresaDocumentoRepositorio;
import br.org.apae.secretaria.empresas.EmpresaRepositorio;
import br.org.apae.secretaria.empresas.dto.EmpresaDocumentoResposta;
import br.org.apae.secretaria.empresas.dto.EmpresaResposta;
import br.org.apae.secretaria.projetos.Enums.StatusExecucao;
import br.org.apae.secretaria.projetos.Enums.TipoMovimentacao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoExecucao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPlano;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.CotacaoDaEmpresa;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.CotacaoResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.DocumentoExecucaoResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.EmpresaNosProjetos;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.EmpresaVinculada;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoDetalhe;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoResumo;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.OrdemDaEmpresa;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.OrdemResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.PagamentoResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.PendenciaResposta;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.vinculos.ServicoVinculo;
import br.org.apae.secretaria.vinculos.TipoRegistro;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import lombok.RequiredArgsConstructor;

/**
 * Execuções (aplicação de parte de um recurso): cadastro com o limite do saldo não distribuído,
 * situação (Kanban), plano de aplicação, empresas ligadas e o detalhe com tudo o que a tela mostra.
 */
@Service
@RequiredArgsConstructor
public class ServicoExecucao {

    static final String REF = "EXECUCAO";
    private static final String REF_EMPRESA = "EMPRESA";

    private final ServicoVinculo servicoVinculo;
    private final ExecucaoRepositorio execucoes;
    private final RecursoRepositorio recursos;
    private final ExecucaoEmpresaRepositorio vinculos;
    private final CotacaoRepositorio cotacoes;
    private final OrdemCompraRepositorio ordens;
    private final ExecucaoDocumentoRepositorio documentos;
    private final PagamentoRepositorio pagamentos;
    private final ExecucaoPendenciaRepositorio pendencias;
    private final EmpresaRepositorio empresas;
    private final EmpresaDocumentoRepositorio documentosEmpresa;
    private final ServicoRecurso servicoRecurso;
    private final CalculoProjetos calculo;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoNumeracao numeracao;
    private final ServicoArquivo servicoArquivo;
    private final Relogio relogio;

    /** Quadro "Execuções de projeto" do Kanban: as de recursos não arquivados, menos as canceladas. */
    @Transactional(readOnly = true)
    public List<ExecucaoResumo> doKanban() {
        Long unidadeId = contexto.unidadeLeitura();
        List<Execucao> lista = execucoes.deRecursosAtivos(unidadeId).stream().filter(e -> !e.cancelada()).toList();
        Map<Long, String> nomes = recursos.findAllById(lista.stream().map(Execucao::getRecursoId).distinct().toList())
                .stream().collect(Collectors.toMap(Recurso::getId, Recurso::getNome));
        return calculo.resumos(lista, nomes, unidadeId, relogio.hoje());
    }

    @Transactional(readOnly = true)
    public ExecucaoDetalhe detalhe(Long id) {
        return detalhe(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Execucao e = buscarParaLeitura(id);
        return historico.doRegistro(e.getUnidadeId(), REF, id);
    }

    @Transactional
    public ExecucaoDetalhe criar(Long recursoId, RequisicaoExecucao req) {
        Recurso r = servicoRecurso.buscarParaEscrita(recursoId);
        if (r.isArquivado()) {
            throw new RegraNegocioExcecao("O recurso está arquivado. Reabra-o para criar execuções.");
        }
        Execucao e = new Execucao(r.getUnidadeId(), recursoId, numeracao.codigo("EXE", r.getUnidadeId()),
                contexto.usuario().id());
        aplicar(e, req);
        exigirSaldo(r, e, null);
        execucoes.save(e);
        servicoRecurso.movimentar(recursoId, TipoMovimentacao.DISTRIBUICAO, e.getValorPlanejado(),
                "Valor destinado à execução \"%s\"".formatted(e.getNome()), null, e.getId());
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.CRIACAO,
                "Execução \"%s\" criada.".formatted(e.getNome()), REF, e.getId());
        return detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe atualizar(Long id, RequisicaoExecucao req) {
        Execucao e = buscarParaEscrita(id);
        BigDecimal valorAntigo = e.getValorPlanejado();
        aplicar(e, req);
        exigirSaldo(recursos.getReferenceById(e.getRecursoId()), e, e.getId());
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EDICAO,
                "Execução \"%s\" editada.".formatted(e.getNome()), REF, id);
        if (valorAntigo.compareTo(e.getValorPlanejado()) != 0) {
            servicoRecurso.movimentar(e.getRecursoId(), TipoMovimentacao.AJUSTE,
                    e.getValorPlanejado().subtract(valorAntigo), "Ajuste no valor planejado de \"%s\" (de %s para %s)."
                            .formatted(e.getNome(), moeda(valorAntigo), moeda(e.getValorPlanejado())),
                    null, e.getId());
        }
        return detalhe(e);
    }

    /** Arrastar no Kanban (o aviso de etapas pendentes ao concluir é dado pela tela). */
    @Transactional
    public ExecucaoResumo alterarStatus(Long id, StatusExecucao status) {
        Execucao e = buscarParaEscrita(id);
        if (e.getStatus() != status) {
            if (e.cancelada()) {
                exigirSaldo(recursos.getReferenceById(e.getRecursoId()), e, e.getId());
            }
            e.setStatus(status);
            historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EDICAO,
                    "Situação de \"%s\" alterada para %s.".formatted(e.getNome(), status.rotulo()), REF, id);
        }
        Recurso r = recursos.getReferenceById(e.getRecursoId());
        return calculo.resumos(List.of(e), Map.of(r.getId(), r.getNome()), e.getUnidadeId(), relogio.hoje()).get(0);
    }

    /** Exclui com tudo o que é dela; o valor planejado volta a ficar livre no recurso. */
    @Transactional
    public void excluir(Long id) {
        Execucao e = buscarParaEscrita(id);
        List<Long> arquivos = Stream.of(
                Stream.of(e.getPlanoArquivoId()),
                cotacoes.findByExecucaoIdOrderByDataAscIdAsc(id).stream().map(Cotacao::getArquivoId),
                ordens.findByExecucaoIdOrderByCriadoEmAsc(id).stream().map(OrdemCompra::getArquivoId),
                documentos.findByExecucaoIdOrderByDataDescIdDesc(id).stream().map(ExecucaoDocumento::getArquivoId),
                pagamentos.findByExecucaoIdOrderByDataDescIdDesc(id).stream().map(Pagamento::getArquivoId))
                .flatMap(Function.identity()).filter(Objects::nonNull).toList();
        servicoRecurso.movimentar(e.getRecursoId(), TipoMovimentacao.AJUSTE, e.getValorPlanejado().negate(),
                "Execução \"%s\" excluída — valor devolvido ao saldo não distribuído.".formatted(e.getNome()), e.getId(),
                null);
        servicoVinculo.removerDoRegistro(TipoRegistro.EXECUCAO, id);
        ordens.deleteAll(ordens.findByExecucaoIdOrderByCriadoEmAsc(id));
        ordens.flush();
        execucoes.delete(e);
        execucoes.flush();
        arquivos.forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EXCLUSAO,
                "Execução \"%s\" excluída.".formatted(e.getNome()), REF, id);
    }

    @Transactional
    public ExecucaoDetalhe salvarPlano(Long id, RequisicaoPlano req) {
        Execucao e = buscarParaEscrita(id);
        Long anterior = e.getPlanoArquivoId();
        if (req.arquivoId() != null && !req.arquivoId().equals(anterior)) {
            servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.PLANO_APLICACAO);
            e.setPlanoArquivoId(req.arquivoId());
            if (anterior != null) {
                servicoArquivo.excluir(anterior);
            }
        }
        e.setPlanoDescricao(Textos.limpo(req.descricao()));
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EDICAO,
                "Plano do projeto \"%s\" atualizado.".formatted(e.getNome()), REF, id);
        return detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe vincularEmpresa(Long id, Long empresaId) {
        Execucao e = buscarParaEscrita(id);
        Empresa empresa = empresas.findById(empresaId).filter(x -> x.getUnidadeId().equals(e.getUnidadeId()))
                .orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        if (vinculos.existsByExecucaoIdAndEmpresaId(id, empresaId)) {
            throw new RegraNegocioExcecao("Essa empresa já está nesta execução.");
        }
        vinculos.save(new ExecucaoEmpresa(id, empresaId));
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.VINCULO,
                "Empresa \"%s\" ligada ao projeto \"%s\".".formatted(empresa.getRazaoSocial(), e.getNome()), REF_EMPRESA,
                empresaId);
        return detalhe(e);
    }

    /** Tira a empresa só desta execução; cotações e ordens dela precisam ser excluídas antes. */
    @Transactional
    public ExecucaoDetalhe desvincularEmpresa(Long id, Long vinculoId) {
        Execucao e = buscarParaEscrita(id);
        ExecucaoEmpresa v = vinculos.findById(vinculoId).filter(x -> x.getExecucaoId().equals(id))
                .orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        long cotacoesDela = cotacoes.findByExecucaoIdOrderByDataAscIdAsc(id).stream()
                .filter(c -> c.getEmpresaId().equals(v.getEmpresaId())).count();
        String nome = empresas.findById(v.getEmpresaId()).map(Empresa::getRazaoSocial).orElse("Empresa");
        if (cotacoesDela > 0) {
            throw new RegraNegocioExcecao(("\"%s\" tem %d cotação(ões) nesta execução. Exclua-as (e as ordens de compra) "
                    + "primeiro e depois remova a empresa.").formatted(nome, cotacoesDela));
        }
        vinculos.delete(v);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.DESVINCULO,
                "Empresa \"%s\" removida do projeto \"%s\".".formatted(nome, e.getNome()), REF_EMPRESA, v.getEmpresaId());
        return detalhe(e);
    }

    /** Aba "Projetos", "Cotações" e "Ordens de compra" da ficha da empresa. */
    @Transactional(readOnly = true)
    public EmpresaNosProjetos daEmpresa(Long empresaId) {
        Empresa empresa = empresas.findById(empresaId).orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        contexto.exigirLeitura(empresa.getUnidadeId());
        List<Cotacao> dela = cotacoes.findByEmpresaIdOrderByDataDesc(empresaId);
        List<Long> ids = Stream.concat(execucoes.daEmpresa(empresaId).stream().map(Execucao::getId),
                dela.stream().map(Cotacao::getExecucaoId)).distinct().toList();
        Map<Long, Execucao> porId = execucoes.findAllById(ids).stream()
                .collect(Collectors.toMap(Execucao::getId, Function.identity()));
        Map<Long, String> nomesRecursos = recursos.findAllById(porId.values().stream().map(Execucao::getRecursoId).distinct().toList())
                .stream().collect(Collectors.toMap(Recurso::getId, Recurso::getNome));
        Map<Long, Cotacao> cotacoesPorId = dela.stream().collect(Collectors.toMap(Cotacao::getId, Function.identity()));
        List<OrdemDaEmpresa> ordensDela = cotacoesPorId.isEmpty() ? List.of()
                : ordens.findByCotacaoIdIn(cotacoesPorId.keySet()).stream().map(o -> new OrdemDaEmpresa(o.getId(),
                        o.getExecucaoId(), nome(porId, o.getExecucaoId()), o.getNumero(), o.getData(), o.getValor(),
                        o.getStatus(), o.getArquivoId())).toList();
        return new EmpresaNosProjetos(
                calculo.resumos(new ArrayList<>(porId.values()), nomesRecursos, empresa.getUnidadeId(), relogio.hoje()),
                dela.stream().map(c -> new CotacaoDaEmpresa(c.getId(), c.getExecucaoId(), nome(porId, c.getExecucaoId()),
                        c.getData(), c.getValorTotal(), c.isVencedora(), c.getArquivoId())).toList(),
                ordensDela);
    }

    Execucao buscarParaLeitura(Long id) {
        Execucao e = execucoes.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Execução"));
        contexto.exigirLeitura(e.getUnidadeId());
        return e;
    }

    Execucao buscarParaEscrita(Long id) {
        Execucao e = execucoes.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Execução"));
        contexto.exigirEscrita(e.getUnidadeId());
        return e;
    }

    ExecucaoDetalhe detalhe(Execucao e) {
        Recurso r = recursos.getReferenceById(e.getRecursoId());
        List<ExecucaoEmpresa> vinculadas = vinculos.findByExecucaoIdOrderByCriadoEmAsc(e.getId());
        List<Long> empresaIds = vinculadas.stream().map(ExecucaoEmpresa::getEmpresaId).toList();
        Map<Long, List<EmpresaDocumentoResposta>> docs = empresaIds.isEmpty() ? Map.of()
                : documentosEmpresa.findByEmpresaIdInOrderByNomeAsc(empresaIds).stream().collect(Collectors.groupingBy(
                        d -> d.getEmpresaId(), Collectors.mapping(EmpresaDocumentoResposta::de, Collectors.toList())));
        Map<Long, Empresa> porId = empresas.findAllById(empresaIds).stream()
                .collect(Collectors.toMap(Empresa::getId, Function.identity()));
        List<CotacaoResposta> listaCotacoes = cotacoes.findByExecucaoIdOrderByDataAscIdAsc(e.getId()).stream()
                .map(CotacaoResposta::de).toList();
        return new ExecucaoDetalhe(e.getId(), r.getId(), r.getNome(), r.isArquivado(), e.getCodigo(), e.getNome(),
                e.getFonteRecurso(), e.getConvenio(), e.getDataInicio(), e.getDataFim(), e.getValorPlanejado(),
                e.getResponsavel(), e.getStatus(), e.getObjetivo(), e.getObservacoes(), e.getPlanoDescricao(),
                e.getPlanoArquivoId(), calculo.situacoes(List.of(e), e.getUnidadeId(), relogio.hoje()).get(e.getId()),
                vinculadas.stream().filter(v -> porId.containsKey(v.getEmpresaId()))
                        .map(v -> new EmpresaVinculada(v.getId(), EmpresaResposta.de(porId.get(v.getEmpresaId()),
                                docs.getOrDefault(v.getEmpresaId(), List.of()))))
                        .toList(),
                listaCotacoes,
                ordens.findByExecucaoIdOrderByCriadoEmAsc(e.getId()).stream().map(OrdemResposta::de).toList(),
                documentos.findByExecucaoIdOrderByDataDescIdDesc(e.getId()).stream().map(DocumentoExecucaoResposta::de).toList(),
                pagamentos.findByExecucaoIdOrderByDataDescIdDesc(e.getId()).stream().map(PagamentoResposta::de).toList(),
                pendencias.findByExecucaoIdOrderByConcluidaAscCriadoEmAsc(e.getId()).stream().map(PendenciaResposta::de).toList(),
                calculo.documentacaoApae(e.getUnidadeId(), relogio.hoje()), e.getAtualizadoEm());
    }

    /** A execução nunca passa do saldo não distribuído do recurso (canceladas não contam). */
    private void exigirSaldo(Recurso r, Execucao e, Long ignorarId) {
        if (e.cancelada()) {
            return;
        }
        BigDecimal livre = calculo.livreParaDistribuir(r, execucoes.findByRecursoIdOrderByDataInicioAscIdAsc(r.getId()),
                ignorarId);
        BigDecimal excedente = e.getValorPlanejado().subtract(livre);
        if (excedente.signum() > 0) {
            throw new RegraNegocioExcecao("Valor da execução excede o saldo disponível para distribuição em %s."
                    .formatted(moeda(excedente)));
        }
    }

    private static String nome(Map<Long, Execucao> porId, Long id) {
        Execucao e = porId.get(id);
        return e == null ? "" : e.getNome();
    }

    private static void aplicar(Execucao e, RequisicaoExecucao req) {
        e.setNome(Textos.limpo(req.nome()));
        e.setFonteRecurso(Textos.limpo(req.fonteRecurso()));
        e.setConvenio(Textos.limpo(req.convenio()));
        e.setDataInicio(req.dataInicio());
        e.setDataFim(req.dataFim());
        e.setValorPlanejado(req.valorPlanejado());
        e.setResponsavel(Textos.limpo(req.responsavel()));
        e.setStatus(req.status());
        e.setObjetivo(Textos.limpo(req.objetivo()));
        e.setObservacoes(Textos.limpo(req.observacoes()));
    }
}

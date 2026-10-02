package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.projetos.Enums.TipoMovimentacao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoDocumentoRecurso;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoRecurso;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoTransferencia;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.DocumentoRecursoResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoResumo;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.MovimentacaoResposta;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.RecursoDetalhe;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.RecursoResumo;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import lombok.RequiredArgsConstructor;

/**
 * Recursos (dinheiro que entrou): cadastro, arquivo, documentos, transferência de saldo e o
 * histórico financeiro, que nunca muda "por baixo" — toda alteração de valor vira movimentação.
 */
@Service
@RequiredArgsConstructor
public class ServicoRecurso {

    static final String REF = "RECURSO";

    private final RecursoRepositorio recursos;
    private final ExecucaoRepositorio execucoes;
    private final RecursoDocumentoRepositorio documentos;
    private final MovimentacaoRepositorio movimentacoes;
    private final CalculoProjetos calculo;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoNumeracao numeracao;
    private final ServicoArquivo servicoArquivo;
    private final Relogio relogio;

    /** Lista com totais e as execuções de cada recurso (arquivados só se pedidos). */
    @Transactional(readOnly = true)
    public List<RecursoResumo> listar(boolean comArquivados) {
        Long unidadeId = contexto.unidadeLeitura();
        List<Recurso> lista = recursos.findByUnidadeIdOrderByDataInicioDescIdDesc(unidadeId).stream()
                .filter(r -> comArquivados || !r.isArquivado()).toList();
        List<Execucao> todas = execucoes.findByRecursoIdIn(lista.stream().map(Recurso::getId).toList());
        Map<Long, BigDecimal> pagos = calculo.pagos(todas);
        Map<Long, String> nomes = lista.stream().collect(Collectors.toMap(Recurso::getId, Recurso::getNome));
        Map<Long, List<ExecucaoResumo>> resumos = calculo
                .resumos(todas, nomes, unidadeId, relogio.hoje()).stream()
                .collect(Collectors.groupingBy(ExecucaoResumo::recursoId));
        Map<Long, List<Execucao>> porRecurso = todas.stream().collect(Collectors.groupingBy(Execucao::getRecursoId));
        return lista.stream().map(r -> new RecursoResumo(r.getId(), r.getCodigo(), r.getNome(), r.getFonteRecurso(),
                r.getOrgaoRepassador(), r.getStatus(), r.isArquivado(),
                calculo.financeiro(r, porRecurso.getOrDefault(r.getId(), List.of()), pagos),
                ordenadas(resumos.getOrDefault(r.getId(), List.of())))).toList();
    }

    @Transactional(readOnly = true)
    public RecursoDetalhe detalhe(Long id) {
        return detalhe(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Recurso r = buscarParaLeitura(id);
        List<Long> filhos = execucoes.findByRecursoIdOrderByDataInicioAscIdAsc(id).stream().map(Execucao::getId).toList();
        return historico.doRegistroEFilhos(r.getUnidadeId(), REF, id, ServicoExecucao.REF, filhos).stream()
                .filter(h -> !"TRANSFERENCIA".equals(String.valueOf(h.acao()))).toList();
    }

    @Transactional
    public RecursoDetalhe criar(RequisicaoRecurso req) {
        Long unidadeId = contexto.unidadeEscrita();
        Recurso r = new Recurso(unidadeId, numeracao.codigo("REC", unidadeId), contexto.usuario().id());
        aplicar(r, req);
        recursos.save(r);
        movimentar(r.getId(), TipoMovimentacao.ENTRADA, r.getValorRecebido(), "Recurso recebido", null, null);
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.CRIACAO,
                "Recurso \"%s\" cadastrado.".formatted(r.getNome()), REF, r.getId());
        return detalhe(r);
    }

    @Transactional
    public RecursoDetalhe atualizar(Long id, RequisicaoRecurso req) {
        Recurso r = buscarParaEscrita(id);
        BigDecimal valorAntigo = r.getValorRecebido();
        aplicar(r, req);
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EDICAO,
                "Recurso \"%s\" editado.".formatted(r.getNome()), REF, id);
        if (valorAntigo.compareTo(r.getValorRecebido()) != 0) {
            movimentar(id, TipoMovimentacao.AJUSTE, r.getValorRecebido().subtract(valorAntigo),
                    "Ajuste no valor recebido (de %s para %s).".formatted(moeda(valorAntigo), moeda(r.getValorRecebido())),
                    null, null);
        }
        return detalhe(r);
    }

    @Transactional
    public void excluir(Long id) {
        Recurso r = buscarParaEscrita(id);
        if (execucoes.existsByRecursoId(id)) {
            throw new RegraNegocioExcecao("Exclua as execuções deste recurso antes (ou prefira \"Arquivar\").");
        }
        List<Long> arquivos = documentos.findByRecursoIdOrderByDataDescIdDesc(id).stream()
                .map(RecursoDocumento::getArquivoId).toList();
        recursos.delete(r);
        arquivos.forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EXCLUSAO,
                "Recurso \"%s\" excluído.".formatted(r.getNome()), REF, id);
    }

    @Transactional
    public RecursoDetalhe arquivar(Long id, boolean arquivar) {
        Recurso r = buscarParaEscrita(id);
        r.setArquivado(arquivar);
        historico.registrar(ModuloHistorico.PROJETOS, arquivar ? AcaoHistorico.ARQUIVAMENTO : AcaoHistorico.REABERTURA,
                "Recurso \"%s\" %s.".formatted(r.getNome(), arquivar ? "arquivado" : "reaberto"), REF, id);
        return detalhe(r);
    }

    @Transactional
    public RecursoDetalhe adicionarDocumento(Long id, RequisicaoDocumentoRecurso req) {
        Recurso r = buscarParaEscrita(id);
        servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.DOCUMENTO_RECURSO);
        documentos.save(new RecursoDocumento(id, Textos.limpo(req.nome()), Textos.limpo(req.observacao()),
                relogio.hoje(), req.arquivoId()));
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.DOCUMENTO,
                "Documento \"%s\" adicionado ao recurso \"%s\".".formatted(Textos.limpo(req.nome()), r.getNome()), REF, id);
        return detalhe(r);
    }

    @Transactional
    public RecursoDetalhe excluirDocumento(Long id, Long documentoId) {
        Recurso r = buscarParaEscrita(id);
        RecursoDocumento d = documentos.findById(documentoId).filter(x -> x.getRecursoId().equals(id))
                .orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        documentos.delete(d);
        servicoArquivo.excluir(d.getArquivoId());
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.EXCLUSAO,
                "Documento \"%s\" excluído do recurso \"%s\".".formatted(d.getNome(), r.getNome()), REF, id);
        return detalhe(r);
    }

    /** Move saldo de uma execução para outra do mesmo recurso (no máximo o saldo da origem). */
    @Transactional
    public RecursoDetalhe transferir(Long id, RequisicaoTransferencia req) {
        Recurso r = buscarParaEscrita(id);
        if (req.origemId().equals(req.destinoId())) {
            throw new RegraNegocioExcecao("Escolha execuções diferentes para origem e destino.");
        }
        Map<Long, Execucao> doRecurso = execucoes.findByRecursoIdOrderByDataInicioAscIdAsc(id).stream()
                .filter(e -> !e.cancelada()).collect(Collectors.toMap(Execucao::getId, Function.identity()));
        Execucao origem = doRecurso.get(req.origemId());
        Execucao destino = doRecurso.get(req.destinoId());
        if (origem == null || destino == null) {
            throw new RegraNegocioExcecao("As duas execuções precisam ser ativas e deste recurso.");
        }
        BigDecimal saldoOrigem = origem.getValorPlanejado().subtract(calculo.pagos(List.of(origem)).get(origem.getId()));
        if (req.valor().compareTo(saldoOrigem) > 0) {
            throw new RegraNegocioExcecao("O saldo de \"%s\" é de %s. Não é possível transferir mais do que isso."
                    .formatted(origem.getNome(), moeda(saldoOrigem)));
        }
        String motivo = Textos.limpo(req.motivo());
        origem.somarAoPlanejado(req.valor().negate());
        destino.somarAoPlanejado(req.valor());
        movimentar(id, TipoMovimentacao.TRANSFERENCIA, req.valor(), motivo, origem.getId(), destino.getId());
        historico.registrar(ModuloHistorico.PROJETOS, AcaoHistorico.TRANSFERENCIA,
                "Transferência de %s de \"%s\" para \"%s\": %s".formatted(moeda(req.valor()), origem.getNome(),
                        destino.getNome(), motivo), REF, id);
        return detalhe(r);
    }

    /** Lançamento no histórico financeiro do recurso (só acrescenta). */
    void movimentar(Long recursoId, TipoMovimentacao tipo, BigDecimal valor, String descricao, Long origemId,
            Long destinoId) {
        movimentacoes.save(new MovimentacaoRecurso(recursoId, tipo, valor, descricao, origemId, destinoId,
                relogio.hoje(), contexto.usuario().id()));
    }

    Recurso buscarParaLeitura(Long id) {
        Recurso r = recursos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Recurso"));
        contexto.exigirLeitura(r.getUnidadeId());
        return r;
    }

    Recurso buscarParaEscrita(Long id) {
        Recurso r = recursos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Recurso"));
        contexto.exigirEscrita(r.getUnidadeId());
        return r;
    }

    static String moeda(BigDecimal valor) {
        return NumberFormat.getCurrencyInstance(Locale.of("pt", "BR")).format(valor);
    }

    private RecursoDetalhe detalhe(Recurso r) {
        List<Execucao> filhas = execucoes.findByRecursoIdOrderByDataInicioAscIdAsc(r.getId());
        return new RecursoDetalhe(r.getId(), r.getCodigo(), r.getNome(), r.getFonteRecurso(), r.getOrgaoRepassador(),
                r.getConvenio(), r.getDataRecebimento(), r.getDataInicio(), r.getDataFim(), r.getValorRecebido(),
                r.getContaBancaria(), r.getResponsavel(), r.getStatus(), r.getFinalidade(), r.getObservacoes(),
                r.isArquivado(), calculo.financeiro(r, filhas, calculo.pagos(filhas)),
                calculo.resumos(filhas, Map.of(r.getId(), r.getNome()), r.getUnidadeId(), relogio.hoje()),
                documentos.findByRecursoIdOrderByDataDescIdDesc(r.getId()).stream().map(DocumentoRecursoResposta::de).toList(),
                movimentacoes.findByRecursoIdOrderByCriadoEmDescIdDesc(r.getId()).stream().map(MovimentacaoResposta::de).toList(),
                r.getAtualizadoEm());
    }

    private static List<ExecucaoResumo> ordenadas(
            List<ExecucaoResumo> lista) {
        return lista.stream().sorted((a, b) -> a.dataInicio().compareTo(b.dataInicio())).toList();
    }

    private static void aplicar(Recurso r, RequisicaoRecurso req) {
        r.setNome(Textos.limpo(req.nome()));
        r.setFonteRecurso(Textos.limpo(req.fonteRecurso()));
        r.setOrgaoRepassador(Textos.limpo(req.orgaoRepassador()));
        r.setConvenio(Textos.limpo(req.convenio()));
        r.setDataRecebimento(req.dataRecebimento());
        r.setDataInicio(req.dataInicio());
        r.setDataFim(req.dataFim());
        r.setValorRecebido(req.valorRecebido());
        r.setContaBancaria(Textos.limpo(req.contaBancaria()));
        r.setResponsavel(Textos.limpo(req.responsavel()));
        r.setStatus(req.status());
        r.setFinalidade(Textos.limpo(req.finalidade()));
        r.setObservacoes(Textos.limpo(req.observacoes()));
    }
}

package br.org.apae.secretaria.projetos;

import static br.org.apae.secretaria.projetos.ServicoRecurso.moeda;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.empresas.Empresa;
import br.org.apae.secretaria.empresas.EmpresaRepositorio;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoCotacao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoDocumentoExecucao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoOrdem;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPagamento;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPendencia;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoDetalhe;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Seções da execução que são listas de itens: cotações (≥3 empresas para escolher a vencedora),
 * ordem de compra (só da vencedora), notas e documentos, pagamentos e pendências.
 * Toda alteração devolve o detalhe da execução atualizado (checklist recalculado).
 */
@Service
@RequiredArgsConstructor
public class ServicoItensExecucao {

    private static final int MINIMO_EMPRESAS_COTADAS = 3;

    private final ServicoExecucao servicoExecucao;
    private final ExecucaoEmpresaRepositorio vinculos;
    private final CotacaoRepositorio cotacoes;
    private final OrdemCompraRepositorio ordens;
    private final ExecucaoDocumentoRepositorio documentos;
    private final PagamentoRepositorio pagamentos;
    private final ExecucaoPendenciaRepositorio pendencias;
    private final EmpresaRepositorio empresas;
    private final ServicoHistorico historico;
    private final ServicoArquivo servicoArquivo;

    // ----- cotações -----

    @Transactional
    public ExecucaoDetalhe adicionarCotacao(Long execucaoId, RequisicaoCotacao req) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        if (!vinculos.existsByExecucaoIdAndEmpresaId(execucaoId, req.empresaId())) {
            throw new RegraNegocioExcecao("Ligue a empresa a esta execução antes de cadastrar a cotação.");
        }
        servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.COTACAO);
        List<Cotacao.Item> itens = req.itens().stream()
                .map(i -> new Cotacao.Item(Textos.limpo(i.descricao()), i.quantidade(), i.valorUnitario())).toList();
        cotacoes.save(new Cotacao(execucaoId, req.empresaId(), req.data(), req.valorTotal(), Textos.limpo(req.observacao()),
                req.arquivoId(), itens));
        registrar(AcaoHistorico.COTACAO, "Cotação de %s adicionada ao projeto \"%s\".".formatted(nomeEmpresa(req.empresaId()),
                e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe escolherVencedora(Long execucaoId, Long cotacaoId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        Cotacao c = cotacaoDa(execucaoId, cotacaoId);
        long faltam = MINIMO_EMPRESAS_COTADAS - empresasCotadas(execucaoId);
        if (faltam > 0) {
            throw new RegraNegocioExcecao("É preciso ter cotações de pelo menos 3 empresas antes de escolher a vencedora.");
        }
        if (ordens.findByExecucaoIdOrderByCriadoEmAsc(execucaoId).stream().anyMatch(o -> !o.getCotacaoId().equals(cotacaoId))) {
            throw new RegraNegocioExcecao("Já existe ordem de compra para a vencedora atual. Exclua a ordem antes de trocar.");
        }
        // Desmarca a atual e grava antes de marcar a nova: o índice único aceita só uma vencedora por execução.
        cotacoes.findByExecucaoIdOrderByDataAscIdAsc(execucaoId).forEach(x -> x.setVencedora(false));
        cotacoes.flush();
        c.setVencedora(true);
        registrar(AcaoHistorico.COTACAO, "Cotação de %s (%s) escolhida como vencedora em \"%s\"."
                .formatted(nomeEmpresa(c.getEmpresaId()), moeda(c.getValorTotal()), e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe excluirCotacao(Long execucaoId, Long cotacaoId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        Cotacao c = cotacaoDa(execucaoId, cotacaoId);
        if (ordens.existsByCotacaoId(cotacaoId)) {
            throw new RegraNegocioExcecao("Esta cotação tem ordem de compra. Exclua a ordem antes.");
        }
        cotacoes.delete(c);
        servicoArquivo.excluir(c.getArquivoId());
        registrar(AcaoHistorico.EXCLUSAO, "A cotação de %s (%s) foi excluída de \"%s\"."
                .formatted(nomeEmpresa(c.getEmpresaId()), moeda(c.getValorTotal()), e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    // ----- ordens de compra -----

    @Transactional
    public ExecucaoDetalhe adicionarOrdem(Long execucaoId, RequisicaoOrdem req) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        long faltam = MINIMO_EMPRESAS_COTADAS - empresasCotadas(execucaoId);
        if (faltam > 0) {
            throw new RegraNegocioExcecao(("Cadastre cotações de pelo menos 3 empresas antes de criar uma ordem de compra. "
                    + "Faltam %d empresa(s).").formatted(faltam));
        }
        Cotacao vencedora = cotacoes.findByExecucaoIdOrderByDataAscIdAsc(execucaoId).stream().filter(Cotacao::isVencedora)
                .findFirst().orElseThrow(() -> new RegraNegocioExcecao("Escolha a cotação vencedora antes de criar a ordem de compra."));
        servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.ORDEM_COMPRA);
        String numero = Textos.limpo(req.numero());
        ordens.save(new OrdemCompra(execucaoId, vencedora.getId(), numero, req.data(), req.valor(), req.status(), req.arquivoId()));
        registrar(AcaoHistorico.ORDEM_COMPRA, "Ordem %s adicionada ao projeto \"%s\".".formatted(numero, e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe excluirOrdem(Long execucaoId, Long ordemId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        OrdemCompra o = ordens.findById(ordemId).filter(x -> x.getExecucaoId().equals(execucaoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Ordem de compra"));
        ordens.delete(o);
        servicoArquivo.excluir(o.getArquivoId());
        registrar(AcaoHistorico.EXCLUSAO, "A ordem %s foi excluída de \"%s\".".formatted(o.getNumero(), e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    // ----- notas e documentos -----

    @Transactional
    public ExecucaoDetalhe adicionarDocumento(Long execucaoId, RequisicaoDocumentoExecucao req) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.DOCUMENTO_EXECUCAO);
        String nome = Textos.limpo(req.nome());
        documentos.save(new ExecucaoDocumento(execucaoId, nome, req.categoria(), req.data(), req.arquivoId()));
        registrar(AcaoHistorico.DOCUMENTO, "Documento \"%s\" anexado em \"%s\".".formatted(nome, e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe excluirDocumento(Long execucaoId, Long documentoId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        ExecucaoDocumento d = documentos.findById(documentoId).filter(x -> x.getExecucaoId().equals(execucaoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        documentos.delete(d);
        servicoArquivo.excluir(d.getArquivoId());
        registrar(AcaoHistorico.EXCLUSAO, "O documento \"%s\" foi excluído de \"%s\".".formatted(d.getNome(), e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    // ----- pagamentos -----

    /** Os avisos (passa do saldo, documentos da empresa vencidos) são confirmados na tela, como no antigo. */
    @Transactional
    public ExecucaoDetalhe adicionarPagamento(Long execucaoId, RequisicaoPagamento req) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        servicoArquivo.exigirCategoria(req.arquivoId(), CategoriaArquivo.COMPROVANTE_PAGAMENTO);
        String fornecedor = Textos.limpo(req.fornecedor());
        if (req.empresaId() != null) {
            Empresa empresa = empresas.findById(req.empresaId()).filter(x -> x.getUnidadeId().equals(e.getUnidadeId()))
                    .orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
            fornecedor = fornecedor != null ? fornecedor : empresa.getRazaoSocial();
        }
        pagamentos.save(new Pagamento(execucaoId, req.empresaId(), fornecedor, req.data(), req.valor(),
                Textos.limpo(req.forma()), req.arquivoId()));
        registrar(AcaoHistorico.PAGAMENTO, "Pagamento de %s%s registrado em \"%s\".".formatted(moeda(req.valor()),
                fornecedor != null ? " a " + fornecedor : "", e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe excluirPagamento(Long execucaoId, Long pagamentoId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        Pagamento p = pagamentos.findById(pagamentoId).filter(x -> x.getExecucaoId().equals(execucaoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Pagamento"));
        pagamentos.delete(p);
        servicoArquivo.excluir(p.getArquivoId());
        registrar(AcaoHistorico.EXCLUSAO, "O pagamento de %s%s (%s) foi excluído de \"%s\".".formatted(moeda(p.getValor()),
                p.getFornecedor() != null ? " a " + p.getFornecedor() : "", Datas.br(p.getData()), e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    // ----- pendências -----

    @Transactional
    public ExecucaoDetalhe adicionarPendencia(Long execucaoId, RequisicaoPendencia req) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        String titulo = Textos.limpo(req.titulo());
        pendencias.save(new ExecucaoPendencia(execucaoId, titulo, req.prioridade(), Textos.limpo(req.descricao())));
        registrar(AcaoHistorico.CRIACAO, "Pendência \"%s\" adicionada ao projeto \"%s\".".formatted(titulo, e.getNome()), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe concluirPendencia(Long execucaoId, Long pendenciaId, boolean concluida) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        ExecucaoPendencia p = pendenciaDa(execucaoId, pendenciaId);
        p.setConcluida(concluida);
        registrar(concluida ? AcaoHistorico.CONCLUSAO : AcaoHistorico.REABERTURA, "Pendência \"%s\" marcada como %s."
                .formatted(p.getTitulo(), concluida ? "concluída" : "pendente"), e);
        return servicoExecucao.detalhe(e);
    }

    @Transactional
    public ExecucaoDetalhe excluirPendencia(Long execucaoId, Long pendenciaId) {
        Execucao e = servicoExecucao.buscarParaEscrita(execucaoId);
        ExecucaoPendencia p = pendenciaDa(execucaoId, pendenciaId);
        pendencias.delete(p);
        registrar(AcaoHistorico.EXCLUSAO, "Pendência \"%s\" excluída.".formatted(p.getTitulo()), e);
        return servicoExecucao.detalhe(e);
    }

    private long empresasCotadas(Long execucaoId) {
        return cotacoes.findByExecucaoIdOrderByDataAscIdAsc(execucaoId).stream().map(Cotacao::getEmpresaId).distinct().count();
    }

    private Cotacao cotacaoDa(Long execucaoId, Long cotacaoId) {
        return cotacoes.findById(cotacaoId).filter(c -> c.getExecucaoId().equals(execucaoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Cotação"));
    }

    private ExecucaoPendencia pendenciaDa(Long execucaoId, Long pendenciaId) {
        return pendencias.findById(pendenciaId).filter(p -> p.getExecucaoId().equals(execucaoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Pendência"));
    }

    private String nomeEmpresa(Long empresaId) {
        return empresas.findById(empresaId).map(Empresa::getRazaoSocial).orElse("empresa");
    }

    private void registrar(AcaoHistorico acao, String descricao, Execucao e) {
        historico.registrar(ModuloHistorico.PROJETOS, acao, descricao, ServicoExecucao.REF, e.getId());
    }
}

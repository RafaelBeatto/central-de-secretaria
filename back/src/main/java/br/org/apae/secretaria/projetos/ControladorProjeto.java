package br.org.apae.secretaria.projetos;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoArquivado;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoConcluirPendencia;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoCotacao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoDocumentoExecucao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoDocumentoRecurso;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoExecucao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoOrdem;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPagamento;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPendencia;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoPlano;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoRecurso;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoStatusExecucao;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoTransferencia;
import br.org.apae.secretaria.projetos.dto.RequisicoesProjeto.RequisicaoVincularEmpresa;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.EmpresaNosProjetos;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoDetalhe;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.ExecucaoResumo;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.RecursoDetalhe;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.RecursoResumo;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Recursos, execuções e as seções da execução. Leitura PROJETO_LER, alteração PROJETO_ESCREVER. */
@RestController
@RequestMapping("/api/projetos")
@RequiredArgsConstructor
public class ControladorProjeto {

    private final ServicoRecurso recursos;
    private final ServicoExecucao execucoes;
    private final ServicoItensExecucao itens;

    // ----- recursos -----

    @GetMapping("/recursos")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public List<RecursoResumo> recursos(@RequestParam(defaultValue = "false") boolean arquivados) {
        return recursos.listar(arquivados);
    }

    @GetMapping("/recursos/{id}")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public RecursoDetalhe recurso(@PathVariable Long id) {
        return recursos.detalhe(id);
    }

    @GetMapping("/recursos/{id}/historico")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public List<HistoricoResposta> historicoRecurso(@PathVariable Long id) {
        return recursos.historicoDo(id);
    }

    @PostMapping("/recursos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe criarRecurso(@Valid @RequestBody RequisicaoRecurso req) {
        return recursos.criar(req);
    }

    @PutMapping("/recursos/{id}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe atualizarRecurso(@PathVariable Long id, @Valid @RequestBody RequisicaoRecurso req) {
        return recursos.atualizar(id, req);
    }

    @DeleteMapping("/recursos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public void excluirRecurso(@PathVariable Long id) {
        recursos.excluir(id);
    }

    @PatchMapping("/recursos/{id}/arquivado")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe arquivar(@PathVariable Long id, @RequestBody RequisicaoArquivado req) {
        return recursos.arquivar(id, req.arquivado());
    }

    @PostMapping("/recursos/{id}/documentos")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe adicionarDocumentoRecurso(@PathVariable Long id, @Valid @RequestBody RequisicaoDocumentoRecurso req) {
        return recursos.adicionarDocumento(id, req);
    }

    @DeleteMapping("/recursos/{id}/documentos/{documentoId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe excluirDocumentoRecurso(@PathVariable Long id, @PathVariable Long documentoId) {
        return recursos.excluirDocumento(id, documentoId);
    }

    @PostMapping("/recursos/{id}/transferencias")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public RecursoDetalhe transferir(@PathVariable Long id, @Valid @RequestBody RequisicaoTransferencia req) {
        return recursos.transferir(id, req);
    }

    @PostMapping("/recursos/{id}/execucoes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe criarExecucao(@PathVariable Long id, @Valid @RequestBody RequisicaoExecucao req) {
        return execucoes.criar(id, req);
    }

    // ----- execuções -----

    @GetMapping("/execucoes")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public List<ExecucaoResumo> execucoesDoKanban() {
        return execucoes.doKanban();
    }

    @GetMapping("/execucoes/{id}")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public ExecucaoDetalhe execucao(@PathVariable Long id) {
        return execucoes.detalhe(id);
    }

    @GetMapping("/execucoes/{id}/historico")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public List<HistoricoResposta> historicoExecucao(@PathVariable Long id) {
        return execucoes.historicoDo(id);
    }

    @PutMapping("/execucoes/{id}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe atualizarExecucao(@PathVariable Long id, @Valid @RequestBody RequisicaoExecucao req) {
        return execucoes.atualizar(id, req);
    }

    @PatchMapping("/execucoes/{id}/status")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoResumo alterarStatus(@PathVariable Long id, @Valid @RequestBody RequisicaoStatusExecucao req) {
        return execucoes.alterarStatus(id, req.status());
    }

    @DeleteMapping("/execucoes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public void excluirExecucao(@PathVariable Long id) {
        execucoes.excluir(id);
    }

    @PutMapping("/execucoes/{id}/plano")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe salvarPlano(@PathVariable Long id, @Valid @RequestBody RequisicaoPlano req) {
        return execucoes.salvarPlano(id, req);
    }

    @PostMapping("/execucoes/{id}/empresas")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe vincularEmpresa(@PathVariable Long id, @Valid @RequestBody RequisicaoVincularEmpresa req) {
        return execucoes.vincularEmpresa(id, req.empresaId());
    }

    @DeleteMapping("/execucoes/{id}/empresas/{vinculoId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe desvincularEmpresa(@PathVariable Long id, @PathVariable Long vinculoId) {
        return execucoes.desvincularEmpresa(id, vinculoId);
    }

    @PostMapping("/execucoes/{id}/cotacoes")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe adicionarCotacao(@PathVariable Long id, @Valid @RequestBody RequisicaoCotacao req) {
        return itens.adicionarCotacao(id, req);
    }

    @PostMapping("/execucoes/{id}/cotacoes/{cotacaoId}/vencedora")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe escolherVencedora(@PathVariable Long id, @PathVariable Long cotacaoId) {
        return itens.escolherVencedora(id, cotacaoId);
    }

    @DeleteMapping("/execucoes/{id}/cotacoes/{cotacaoId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe excluirCotacao(@PathVariable Long id, @PathVariable Long cotacaoId) {
        return itens.excluirCotacao(id, cotacaoId);
    }

    @PostMapping("/execucoes/{id}/ordens")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe adicionarOrdem(@PathVariable Long id, @Valid @RequestBody RequisicaoOrdem req) {
        return itens.adicionarOrdem(id, req);
    }

    @DeleteMapping("/execucoes/{id}/ordens/{ordemId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe excluirOrdem(@PathVariable Long id, @PathVariable Long ordemId) {
        return itens.excluirOrdem(id, ordemId);
    }

    @PostMapping("/execucoes/{id}/documentos")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe adicionarDocumento(@PathVariable Long id, @Valid @RequestBody RequisicaoDocumentoExecucao req) {
        return itens.adicionarDocumento(id, req);
    }

    @DeleteMapping("/execucoes/{id}/documentos/{documentoId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe excluirDocumento(@PathVariable Long id, @PathVariable Long documentoId) {
        return itens.excluirDocumento(id, documentoId);
    }

    @PostMapping("/execucoes/{id}/pagamentos")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe adicionarPagamento(@PathVariable Long id, @Valid @RequestBody RequisicaoPagamento req) {
        return itens.adicionarPagamento(id, req);
    }

    @DeleteMapping("/execucoes/{id}/pagamentos/{pagamentoId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe excluirPagamento(@PathVariable Long id, @PathVariable Long pagamentoId) {
        return itens.excluirPagamento(id, pagamentoId);
    }

    @PostMapping("/execucoes/{id}/pendencias")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe adicionarPendencia(@PathVariable Long id, @Valid @RequestBody RequisicaoPendencia req) {
        return itens.adicionarPendencia(id, req);
    }

    @PatchMapping("/execucoes/{id}/pendencias/{pendenciaId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe concluirPendencia(@PathVariable Long id, @PathVariable Long pendenciaId,
            @RequestBody RequisicaoConcluirPendencia req) {
        return itens.concluirPendencia(id, pendenciaId, req.concluida());
    }

    @DeleteMapping("/execucoes/{id}/pendencias/{pendenciaId}")
    @PreAuthorize(Permissoes.PROJETO_ESCREVER)
    public ExecucaoDetalhe excluirPendencia(@PathVariable Long id, @PathVariable Long pendenciaId) {
        return itens.excluirPendencia(id, pendenciaId);
    }

    /** Abas Cotações, Ordens de compra e Projetos da ficha da empresa. */
    @GetMapping("/empresas/{empresaId}")
    @PreAuthorize(Permissoes.PROJETO_LER)
    public EmpresaNosProjetos daEmpresa(@PathVariable Long empresaId) {
        return execucoes.daEmpresa(empresaId);
    }
}

package br.org.apae.secretaria.tarefas;

import java.time.LocalDate;
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
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.tarefas.dto.RequisicaoTarefa;
import br.org.apae.secretaria.tarefas.dto.RequisicaoTarefaRapida;
import br.org.apae.secretaria.tarefas.dto.RequisicoesAlteracao;
import br.org.apae.secretaria.tarefas.dto.SugestoesTarefa;
import br.org.apae.secretaria.tarefas.dto.TarefaResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tarefas")
@RequiredArgsConstructor
public class ControladorTarefa {

    private final ServicoTarefa servico;

    // ---------- leitura (TAREFA_LER) ----------

    @GetMapping
    @PreAuthorize(Permissoes.TAREFA_LER)
    public List<TarefaResposta> ativas(@RequestParam(required = false) LocalDate concluidasDesde) {
        return servico.ativas(concluidasDesde);
    }

    @GetMapping("/encerradas")
    @PreAuthorize(Permissoes.TAREFA_LER)
    public List<TarefaResposta> encerradas(@RequestParam(defaultValue = "50") int limite) {
        return servico.encerradas(limite);
    }

    @GetMapping("/sugestoes")
    @PreAuthorize(Permissoes.TAREFA_LER)
    public SugestoesTarefa sugestoes() {
        return servico.sugestoes();
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.TAREFA_LER)
    public TarefaResposta detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize(Permissoes.TAREFA_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return servico.historicoDa(id);
    }

    // ---------- escrita (TAREFA_ESCREVER) ----------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta criar(@Valid @RequestBody RequisicaoTarefa requisicao) {
        return servico.criar(requisicao);
    }

    @PostMapping("/rapida")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta criarRapida(@Valid @RequestBody RequisicaoTarefaRapida requisicao) {
        return servico.criarRapida(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoTarefa requisicao) {
        return servico.atualizar(id, requisicao);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public void excluir(@PathVariable Long id) {
        servico.excluir(id);
    }

    @PostMapping("/{id}/concluir")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta concluir(@PathVariable Long id) {
        return servico.concluir(id);
    }

    @PostMapping("/{id}/reabrir")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta reabrir(@PathVariable Long id) {
        return servico.reabrir(id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta alterarStatus(@PathVariable Long id, @Valid @RequestBody RequisicoesAlteracao.Status requisicao) {
        return servico.alterarStatus(id, requisicao.status());
    }

    @PatchMapping("/{id}/prioridade")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta alterarPrioridade(@PathVariable Long id,
            @Valid @RequestBody RequisicoesAlteracao.NovaPrioridade requisicao) {
        return servico.alterarPrioridade(id, requisicao.prioridade());
    }

    @PatchMapping("/{id}/data")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta moverPara(@PathVariable Long id, @Valid @RequestBody RequisicoesAlteracao.NovaData requisicao) {
        return servico.moverPara(id, requisicao.data());
    }

    @PostMapping("/{id}/subtarefas")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta adicionarSubtarefa(@PathVariable Long id,
            @Valid @RequestBody RequisicoesAlteracao.NovaSubtarefa requisicao) {
        return servico.adicionarSubtarefa(id, requisicao.texto());
    }

    @PatchMapping("/{id}/subtarefas/{subtarefaId}")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta marcarSubtarefa(@PathVariable Long id, @PathVariable Long subtarefaId,
            @Valid @RequestBody RequisicoesAlteracao.MarcarSubtarefa requisicao) {
        return servico.marcarSubtarefa(id, subtarefaId, requisicao.feita());
    }

    @DeleteMapping("/{id}/subtarefas/{subtarefaId}")
    @PreAuthorize(Permissoes.TAREFA_ESCREVER)
    public TarefaResposta removerSubtarefa(@PathVariable Long id, @PathVariable Long subtarefaId) {
        return servico.removerSubtarefa(id, subtarefaId);
    }
}

package br.org.apae.secretaria.agenda;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
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
import br.org.apae.secretaria.agenda.dto.EventoDetalhe;
import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.dto.RequisicaoEvento;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.tarefas.dto.RequisicoesAlteracao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/agenda")
@RequiredArgsConstructor
public class ControladorAgenda {

    private final ServicoAgenda agenda;
    private final ServicoEvento eventos;

    // ---------- leitura (AGENDA_LER) ----------

    /** Eventos, tarefas e prazos do período (até 100 dias). */
    @GetMapping
    @PreAuthorize(Permissoes.AGENDA_LER)
    public List<ItemAgenda> itens(@RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate fim) {
        return agenda.itens(inicio, fim);
    }

    @GetMapping("/eventos/{id}")
    @PreAuthorize(Permissoes.AGENDA_LER)
    public EventoDetalhe detalhe(@PathVariable Long id) {
        return eventos.detalhe(id);
    }

    @GetMapping("/eventos/{id}/historico")
    @PreAuthorize(Permissoes.AGENDA_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return eventos.historicoDo(id);
    }

    // ---------- escrita (AGENDA_ESCREVER) ----------

    @PostMapping("/eventos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public EventoDetalhe criar(@Valid @RequestBody RequisicaoEvento requisicao) {
        return eventos.criar(requisicao);
    }

    @PutMapping("/eventos/{id}")
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public EventoDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoEvento requisicao) {
        return eventos.atualizar(id, requisicao);
    }

    @DeleteMapping("/eventos/{id}")
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public int excluir(@PathVariable Long id, @RequestParam(defaultValue = "SO_ESTA") EscopoSerie escopo) {
        return eventos.excluir(id, escopo);
    }

    @PostMapping("/eventos/{id}/concluir")
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public EventoDetalhe concluir(@PathVariable Long id) {
        return eventos.concluir(id);
    }

    @PostMapping("/eventos/{id}/reabrir")
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public EventoDetalhe reabrir(@PathVariable Long id) {
        return eventos.reabrir(id);
    }

    @PatchMapping("/eventos/{id}/data")
    @PreAuthorize(Permissoes.AGENDA_ESCREVER)
    public EventoDetalhe moverPara(@PathVariable Long id, @Valid @RequestBody RequisicoesAlteracao.NovaData requisicao) {
        return eventos.moverPara(id, requisicao.data());
    }
}

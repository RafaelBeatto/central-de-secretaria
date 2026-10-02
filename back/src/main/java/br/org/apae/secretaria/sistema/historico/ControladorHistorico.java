package br.org.apae.secretaria.sistema.historico;

import java.time.Instant;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/historico")
@RequiredArgsConstructor
public class ControladorHistorico {

    private final ServicoHistorico historico;

    /** Ações do período (instantes: o navegador manda a meia-noite local de cada dia). */
    @GetMapping
    @PreAuthorize(Permissoes.HISTORICO_LER)
    public List<HistoricoResposta> doPeriodo(@RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant desde,
            @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant ate) {
        return historico.doPeriodo(desde, ate);
    }
}

package br.org.apae.secretaria.relatorios;

import java.time.LocalDate;
import java.util.Set;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
public class ControladorRelatorio {

    private final ServicoRelatorio relatorios;

    /** "secoes" opcional (secretaria, agenda, atendimentos, documentos, projetos); vazio = todas. */
    @GetMapping("/atividades")
    @PreAuthorize(Permissoes.RELATORIO_LER)
    public RelatorioAtividades atividades(@RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate ate,
            @RequestParam(required = false, defaultValue = "") Set<String> secoes) {
        return relatorios.atividades(de, ate, secoes);
    }
}

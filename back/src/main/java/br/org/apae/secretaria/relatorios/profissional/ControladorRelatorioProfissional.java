package br.org.apae.secretaria.relatorios.profissional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.relatorios.profissional.dto.ProfissionalCentral;
import br.org.apae.secretaria.relatorios.profissional.dto.RelatorioProfissionalResposta;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoCobrancaRelatorio;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoEntregaRelatorio;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoRelatorioProfissional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/relatorios-profissionais")
@RequiredArgsConstructor
public class ControladorRelatorioProfissional {

    private static final String ENVIAR_OU_LER =
            "hasAnyAuthority('RELATORIO_PROF_ENVIAR','RELATORIO_PROF_LER')";

    private final ServicoRelatorioProfissional servico;

    /** Meus Relatórios (professor/profissional). */
    @GetMapping("/meus")
    @PreAuthorize(Permissoes.RELATORIO_PROF_ENVIAR)
    public List<RelatorioProfissionalResposta> meus() {
        return servico.meus();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.RELATORIO_PROF_ENVIAR)
    public RelatorioProfissionalResposta enviar(@Valid @RequestBody RequisicaoRelatorioProfissional requisicao) {
        return servico.enviar(requisicao);
    }

    /** Atende a uma cobrança: o PDF (e, se quiser, o período) do relatório pendente. */
    @PostMapping("/{id}/entregar")
    @PreAuthorize(Permissoes.RELATORIO_PROF_ENVIAR)
    public RelatorioProfissionalResposta entregar(@PathVariable Long id, @Valid @RequestBody RequisicaoEntregaRelatorio requisicao) {
        return servico.entregar(id, requisicao);
    }

    /** Central: cobra um relatório de um professor/profissional. */
    @PostMapping("/central/profissionais/{usuarioId}/cobrar")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.RELATORIO_PROF_COBRAR)
    public RelatorioProfissionalResposta cobrar(@PathVariable Long usuarioId, @Valid @RequestBody RequisicaoCobrancaRelatorio requisicao) {
        return servico.cobrar(usuarioId, requisicao);
    }

    /** Central de Relatórios: lista de profissionais com o total de relatórios. */
    @GetMapping("/central/profissionais")
    @PreAuthorize(Permissoes.RELATORIO_PROF_LER)
    public List<ProfissionalCentral> profissionais(@RequestParam(defaultValue = "") String busca,
            @RequestParam(required = false) Integer ano,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate ate,
            @RequestParam(required = false) StatusRelatorio status) {
        return servico.profissionais(busca, ano, de, ate, status);
    }

    @GetMapping("/central/profissionais/{usuarioId}")
    @PreAuthorize(Permissoes.RELATORIO_PROF_LER)
    public List<RelatorioProfissionalResposta> doProfissional(@PathVariable Long usuarioId,
            @RequestParam(required = false) Integer ano,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate ate,
            @RequestParam(required = false) StatusRelatorio status) {
        return servico.doProfissional(usuarioId, ano, de, ate, status);
    }

    /** Link temporário para abrir ou baixar o PDF (autor ou Central). */
    @GetMapping("/{id}/url")
    @PreAuthorize(ENVIAR_OU_LER)
    public Map<String, String> url(@PathVariable Long id) {
        return Map.of("url", servico.url(id));
    }
}

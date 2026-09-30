package br.org.apae.secretaria.acesso.unidade;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.acesso.unidade.dto.RequisicaoDadosInstitucionais;
import br.org.apae.secretaria.acesso.unidade.dto.RequisicaoUnidade;
import br.org.apae.secretaria.acesso.unidade.dto.UnidadeDetalhe;
import br.org.apae.secretaria.acesso.unidade.dto.UnidadeResumo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/unidades")
@RequiredArgsConstructor
public class ControladorUnidade {

    private final ServicoUnidade servico;

    /** Própria unidade + subordinadas (qualquer usuário logado, para o seletor de unidade). */
    @GetMapping("/arvore")
    public List<UnidadeResumo> arvore() {
        return servico.arvore();
    }

    /** Unidade em consulta (cabeçalho X-Unidade ou a própria): dados do cabeçalho dos PDFs. */
    @GetMapping("/atual")
    public UnidadeDetalhe atual() {
        return servico.atual();
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.UNIDADE_LER)
    public UnidadeDetalhe detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.UNIDADE_ESCREVER)
    public UnidadeDetalhe criar(@Valid @RequestBody RequisicaoUnidade requisicao) {
        return servico.criarSubordinada(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.UNIDADE_ESCREVER)
    public UnidadeDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoUnidade requisicao) {
        return servico.atualizarSubordinada(id, requisicao);
    }

    @PutMapping("/minha/dados-institucionais")
    @PreAuthorize(Permissoes.INSTITUICAO_ESCREVER)
    public UnidadeDetalhe atualizarDadosInstitucionais(@Valid @RequestBody RequisicaoDadosInstitucionais requisicao) {
        return servico.atualizarDadosInstitucionais(requisicao);
    }
}

package br.org.apae.secretaria.documentos;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.documentos.dto.DocumentoResposta;
import br.org.apae.secretaria.documentos.dto.RequisicaoDocumento;
import br.org.apae.secretaria.documentos.dto.RequisicaoRenovarDocumento;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class ControladorDocumento {

    private final ServicoDocumento servico;

    @GetMapping
    @PreAuthorize(Permissoes.DOCUMENTO_LER)
    public List<DocumentoResposta> itens() {
        return servico.itens();
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.DOCUMENTO_LER)
    public DocumentoResposta detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize(Permissoes.DOCUMENTO_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return servico.historicoDo(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.DOCUMENTO_ESCREVER)
    public DocumentoResposta criar(@Valid @RequestBody RequisicaoDocumento requisicao) {
        return servico.criar(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.DOCUMENTO_ESCREVER)
    public DocumentoResposta atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoDocumento requisicao) {
        return servico.atualizar(id, requisicao);
    }

    @PostMapping("/{id}/renovar")
    @PreAuthorize(Permissoes.DOCUMENTO_ESCREVER)
    public DocumentoResposta renovar(@PathVariable Long id, @Valid @RequestBody RequisicaoRenovarDocumento requisicao) {
        return servico.renovar(id, requisicao);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.DOCUMENTO_ESCREVER)
    public void excluir(@PathVariable Long id) {
        servico.excluir(id);
    }
}

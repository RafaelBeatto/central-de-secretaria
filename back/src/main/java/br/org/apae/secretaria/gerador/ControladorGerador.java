package br.org.apae.secretaria.gerador;

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
import br.org.apae.secretaria.gerador.dto.DocumentoGeradoItem;
import br.org.apae.secretaria.gerador.dto.DocumentoGeradoResposta;
import br.org.apae.secretaria.gerador.dto.ModeloResposta;
import br.org.apae.secretaria.gerador.dto.RequisicaoAnexo;
import br.org.apae.secretaria.gerador.dto.RequisicaoDocumentoGerado;
import br.org.apae.secretaria.gerador.dto.RequisicaoModelo;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/gerador")
@RequiredArgsConstructor
public class ControladorGerador {

    private final ServicoModeloDocumento modelos;
    private final ServicoDocumentoGerado documentos;

    // ---- modelos ----

    @GetMapping("/modelos")
    @PreAuthorize(Permissoes.GERADOR_LER)
    public List<ModeloResposta> modelos() {
        return modelos.itens();
    }

    @PostMapping("/modelos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public ModeloResposta criarModelo(@Valid @RequestBody RequisicaoModelo r) {
        return modelos.criar(r);
    }

    @PutMapping("/modelos/{id}")
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public ModeloResposta atualizarModelo(@PathVariable Long id, @Valid @RequestBody RequisicaoModelo r) {
        return modelos.atualizar(id, r);
    }

    @PostMapping("/modelos/{id}/duplicar")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public ModeloResposta duplicarModelo(@PathVariable Long id) {
        return modelos.duplicar(id);
    }

    @DeleteMapping("/modelos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public void excluirModelo(@PathVariable Long id) {
        modelos.excluir(id);
    }

    // ---- documentos gerados ----

    @GetMapping("/documentos")
    @PreAuthorize(Permissoes.GERADOR_LER)
    public List<DocumentoGeradoItem> documentos() {
        return documentos.itens();
    }

    @GetMapping("/documentos/{id}")
    @PreAuthorize(Permissoes.GERADOR_LER)
    public DocumentoGeradoResposta documento(@PathVariable Long id) {
        return documentos.detalhe(id);
    }

    @GetMapping("/documentos/{id}/historico")
    @PreAuthorize(Permissoes.GERADOR_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return documentos.historicoDo(id);
    }

    @PostMapping("/documentos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public DocumentoGeradoResposta gerar(@Valid @RequestBody RequisicaoDocumentoGerado r) {
        return documentos.criar(r);
    }

    @PutMapping("/documentos/{id}")
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public DocumentoGeradoResposta atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoDocumentoGerado r) {
        return documentos.atualizar(id, r);
    }

    @PostMapping("/documentos/{id}/duplicar")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public DocumentoGeradoResposta duplicar(@PathVariable Long id) {
        return documentos.duplicar(id);
    }

    @DeleteMapping("/documentos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public void excluir(@PathVariable Long id) {
        documentos.excluir(id);
    }

    @PostMapping("/documentos/{id}/anexos")
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public DocumentoGeradoResposta anexar(@PathVariable Long id, @Valid @RequestBody RequisicaoAnexo r) {
        return documentos.anexar(id, r.arquivoId());
    }

    @DeleteMapping("/documentos/{id}/anexos/{arquivoId}")
    @PreAuthorize(Permissoes.GERADOR_ESCREVER)
    public DocumentoGeradoResposta removerAnexo(@PathVariable Long id, @PathVariable Long arquivoId) {
        return documentos.removerAnexo(id, arquivoId);
    }
}

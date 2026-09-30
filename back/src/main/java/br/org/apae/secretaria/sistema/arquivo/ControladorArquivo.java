package br.org.apae.secretaria.sistema.arquivo;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.org.apae.secretaria.sistema.arquivo.dto.ArquivoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Envio e abertura de arquivos. O envio devolve o id, que o formulário manda
 * junto com os dados do registro (documento, cotação, pagamento…).
 */
@RestController
@RequestMapping("/api/arquivos")
@RequiredArgsConstructor
public class ControladorArquivo {

    private final ServicoArquivo servico;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ArquivoResposta enviar(@RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam("categoria") CategoriaArquivo categoria) {
        return servico.enviar(arquivo, categoria);
    }

    @GetMapping("/{id}")
    public ArquivoResposta dados(@PathVariable Long id) {
        return servico.dados(id);
    }

    /** Link temporário (poucos minutos) para abrir ou baixar. */
    @GetMapping("/{id}/url")
    public Map<String, String> url(@PathVariable Long id) {
        return Map.of("url", servico.urlTemporaria(id));
    }
}

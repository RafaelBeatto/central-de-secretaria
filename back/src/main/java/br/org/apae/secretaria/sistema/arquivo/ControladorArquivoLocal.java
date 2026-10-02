package br.org.apae.secretaria.sistema.arquivo;

import java.nio.file.Files;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

/**
 * SÓ PARA DESENVOLVIMENTO (junto do {@link ArmazenamentoLocal}): serve o arquivo do link assinado.
 * É rota pública porque o navegador abre o link sem o cabeçalho de autenticação, como faria com o link do S3;
 * quem protege é a assinatura com validade.
 */
@RestController
@RequestMapping("/api/arquivos-locais")
@ConditionalOnExpression(Armazenamento.CONDICAO_LOCAL)
@RequiredArgsConstructor
public class ControladorArquivoLocal {

    private final ArmazenamentoLocal armazenamento;

    @GetMapping("/{token}")
    public ResponseEntity<Resource> abrir(@PathVariable String token) throws java.io.IOException {
        ArmazenamentoLocal.Arquivo arquivo = armazenamento.abrir(token);
        if (arquivo == null) {
            return ResponseEntity.notFound().build();
        }
        MediaType tipo = MediaTypeFactory.getMediaType(arquivo.nome()).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, arquivo.disposicao())
                .contentType(tipo)
                .contentLength(Files.size(arquivo.caminho()))
                .body(new FileSystemResource(arquivo.caminho()));
    }
}

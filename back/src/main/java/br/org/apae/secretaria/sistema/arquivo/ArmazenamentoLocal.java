package br.org.apae.secretaria.sistema.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import br.org.apae.secretaria.configuracao.PropriedadesAplicacao;

/**
 * SÓ PARA DESENVOLVIMENTO: guarda os arquivos numa pasta da máquina quando não há chaves da AWS
 * ({@code aplicacao.armazenamento.pasta-local}; vazia em produção, onde vale o S3). O link de abertura é
 * assinado e expira, como o do S3 (ver {@link ControladorArquivoLocal}).
 */
@Component
@ConditionalOnExpression(Armazenamento.CONDICAO_LOCAL)
public class ArmazenamentoLocal implements Armazenamento {

    private static final Logger log = LoggerFactory.getLogger(ArmazenamentoLocal.class);
    private static final Base64.Encoder CODIFICADOR = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODIFICADOR = Base64.getUrlDecoder();

    private final Path pasta;
    private final long validadeSegundos;
    /** Muda a cada partida: links antigos deixam de valer ao reiniciar. */
    private final byte[] segredo = UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8);

    public ArmazenamentoLocal(@Value("${aplicacao.armazenamento.pasta-local}") String pasta,
            PropriedadesAplicacao propriedades) {
        this.pasta = Path.of(pasta).toAbsolutePath().normalize();
        this.validadeSegundos = propriedades.armazenamento().validadeUrlMinutos() * 60;
        log.warn("Arquivos guardados em PASTA LOCAL ({}), pois não há chaves da AWS. Use só em desenvolvimento.", this.pasta);
    }

    @Override
    public void enviar(String chave, InputStream conteudo, long tamanho, String tipoConteudo) throws IOException {
        Path destino = caminho(chave);
        Files.createDirectories(destino.getParent());
        Files.copy(conteudo, destino, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public String urlTemporaria(String chave, String nomeOriginal) {
        String carga = CODIFICADOR.encodeToString(chave.getBytes(StandardCharsets.UTF_8)) + "."
                + (Instant.now().getEpochSecond() + validadeSegundos) + "."
                + CODIFICADOR.encodeToString(nomeOriginal.getBytes(StandardCharsets.UTF_8));
        return "/api/arquivos-locais/" + carga + "." + assinar(carga);
    }

    @Override
    public void excluir(String chave) {
        try {
            Files.deleteIfExists(caminho(chave));
        } catch (IOException e) {
            log.warn("Não foi possível apagar o arquivo local {}", chave, e);
        }
    }

    /** Valida o link e devolve o arquivo a servir (ou nulo se a assinatura é falsa, venceu ou o arquivo não existe). */
    Arquivo abrir(String token) {
        int corte = token.lastIndexOf('.');
        if (corte < 0) {
            return null;
        }
        String carga = token.substring(0, corte);
        if (!MessageDigest.isEqual(assinar(carga).getBytes(StandardCharsets.UTF_8),
                token.substring(corte + 1).getBytes(StandardCharsets.UTF_8))) {
            return null;
        }
        String[] partes = carga.split("\\.");
        if (partes.length != 3 || Long.parseLong(partes[1]) < Instant.now().getEpochSecond()) {
            return null;
        }
        Path arquivo = caminho(new String(DECODIFICADOR.decode(partes[0]), StandardCharsets.UTF_8));
        return Files.isRegularFile(arquivo)
                ? new Arquivo(arquivo, new String(DECODIFICADOR.decode(partes[2]), StandardCharsets.UTF_8))
                : null;
    }

    /** Arquivo a servir e o nome com que o navegador o abre. */
    record Arquivo(Path caminho, String nome) {
        String disposicao() {
            return "inline; filename*=UTF-8''" + URLEncoder.encode(nome, StandardCharsets.UTF_8).replace("+", "%20");
        }
    }

    private Path caminho(String chave) {
        Path destino = pasta.resolve(chave).normalize();
        if (!destino.startsWith(pasta)) {
            throw new IllegalArgumentException("Caminho de arquivo inválido.");
        }
        return destino;
    }

    private String assinar(String carga) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo, "HmacSHA256"));
            return CODIFICADOR.encodeToString(mac.doFinal(carga.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}

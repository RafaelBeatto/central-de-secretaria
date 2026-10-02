package br.org.apae.secretaria.sistema.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import br.org.apae.secretaria.configuracao.PropriedadesAplicacao;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/** Operações de baixo nível no bucket. Não conhece regras de negócio. */
@Component
@ConditionalOnExpression("!(" + Armazenamento.CONDICAO_LOCAL + ")")
public class ArmazenamentoS3 implements Armazenamento {

    private final S3Client cliente;
    private final S3Presigner assinador;
    private final String bucket;
    private final Duration validadeUrl;

    public ArmazenamentoS3(S3Client cliente, S3Presigner assinador, PropriedadesAplicacao propriedades) {
        this.cliente = cliente;
        this.assinador = assinador;
        this.bucket = propriedades.armazenamento().bucket();
        this.validadeUrl = Duration.ofMinutes(propriedades.armazenamento().validadeUrlMinutos());
    }

    @Override
    public void enviar(String chave, InputStream conteudo, long tamanho, String tipoConteudo) throws IOException {
        cliente.putObject(PutObjectRequest.builder()
                .bucket(bucket)
                .key(chave)
                .contentType(tipoConteudo)
                .contentLength(tamanho)
                .build(), RequestBody.fromInputStream(conteudo, tamanho));
    }

    /** Link temporário para baixar/abrir o arquivo com o nome original. */
    @Override
    public String urlTemporaria(String chave, String nomeOriginal) {
        String disposicao = "inline; filename*=UTF-8''" + URLEncoder.encode(nomeOriginal, StandardCharsets.UTF_8).replace("+", "%20");
        GetObjectRequest pedido = GetObjectRequest.builder()
                .bucket(bucket)
                .key(chave)
                .responseContentDisposition(disposicao)
                .build();
        return assinador.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(validadeUrl)
                .getObjectRequest(pedido)
                .build()).url().toString();
    }

    @Override
    public void excluir(String chave) {
        cliente.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(chave).build());
    }
}

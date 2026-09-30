package br.org.apae.secretaria.configuracao;

import java.net.URI;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Clientes da AWS S3. As credenciais vêm do .env (chave-acesso/chave-secreta);
 * vazias, vale a cadeia padrão da AWS (perfil ~/.aws ou papel da máquina) — nunca do código.
 * Com "endpoint" preenchido, aponta para um S3 compatível local (ex.: MinIO).
 */
@Configuration
public class ConfiguracaoS3 {

    @Bean(destroyMethod = "close")
    S3Client clienteS3(PropriedadesAplicacao propriedades) {
        var armazenamento = propriedades.armazenamento();
        var construtor = S3Client.builder()
                .region(Region.of(armazenamento.regiao()))
                .credentialsProvider(credenciais(armazenamento));
        if (StringUtils.hasText(armazenamento.endpoint())) {
            construtor.endpointOverride(URI.create(armazenamento.endpoint()))
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }
        return construtor.build();
    }

    @Bean(destroyMethod = "close")
    S3Presigner assinadorS3(PropriedadesAplicacao propriedades) {
        var armazenamento = propriedades.armazenamento();
        var construtor = S3Presigner.builder()
                .region(Region.of(armazenamento.regiao()))
                .credentialsProvider(credenciais(armazenamento));
        if (StringUtils.hasText(armazenamento.endpoint())) {
            construtor.endpointOverride(URI.create(armazenamento.endpoint()))
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }
        return construtor.build();
    }

    private static AwsCredentialsProvider credenciais(PropriedadesAplicacao.Armazenamento armazenamento) {
        if (StringUtils.hasText(armazenamento.chaveAcesso()) && StringUtils.hasText(armazenamento.chaveSecreta())) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(armazenamento.chaveAcesso(), armazenamento.chaveSecreta()));
        }
        return DefaultCredentialsProvider.builder().build();
    }
}

package br.org.apae.secretaria.configuracao;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Configurações próprias da aplicação (prefixo "aplicacao" no application.properties). */
@Validated
@ConfigurationProperties(prefix = "aplicacao")
public record PropriedadesAplicacao(@Valid Jwt jwt, @Valid Cors cors, @Valid Armazenamento armazenamento,
        @NotBlank String fusoHorarioPadrao) {

    public record Jwt(
            @NotBlank @Size(min = 32) String segredo,
            @Positive long validadeAcessoMinutos,
            @Positive long validadeRenovacaoDias) {
    }

    public record Cors(List<String> origensPermitidas) {
    }

    public record Armazenamento(
            @NotBlank String bucket,
            @NotBlank String regiao,
            String endpoint,
            @Positive long tamanhoMaximoMb,
            @Positive long validadeUrlMinutos) {

        public long tamanhoMaximoBytes() {
            return tamanhoMaximoMb * 1024 * 1024;
        }
    }
}

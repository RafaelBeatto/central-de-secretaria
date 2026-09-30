package br.org.apae.secretaria;

import java.util.Locale;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
public class CentralSecretariaAplicacao {

    public static void main(String[] args) {
        // Mensagens padrão de validação (Hibernate Validator) em português.
        Locale.setDefault(Locale.of("pt", "BR"));
        SpringApplication.run(CentralSecretariaAplicacao.class, args);
    }
}

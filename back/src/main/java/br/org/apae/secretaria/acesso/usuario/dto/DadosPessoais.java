package br.org.apae.secretaria.acesso.usuario.dto;

import java.time.LocalDate;

/** Campos comuns à criação e à edição de usuário (evita repetir o mapeamento no serviço). */
public interface DadosPessoais {

    String nome();

    String sobrenome();

    String telefone();

    String email();

    LocalDate dataNascimento();

    Short cargoId();

    Long unidadeId();

    /** Contato: pelo menos telefone ou e-mail. */
    default boolean temContato() {
        return (telefone() != null && !telefone().isBlank()) || (email() != null && !email().isBlank());
    }
}

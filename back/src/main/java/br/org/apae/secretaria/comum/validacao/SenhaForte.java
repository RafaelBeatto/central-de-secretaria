package br.org.apae.secretaria.comum.validacao;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Regra única de senha: 8 a 72 caracteres, com pelo menos uma letra e um número. */
@Documented
@NotBlank
@Size(min = Limites.SENHA_MINIMO, max = Limites.SENHA_MAXIMO)
@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).*$", message = "deve ter pelo menos uma letra e um número")
@Constraint(validatedBy = {})
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
public @interface SenhaForte {

    String message() default "senha fraca";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}

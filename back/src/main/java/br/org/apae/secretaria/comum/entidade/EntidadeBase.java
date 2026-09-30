package br.org.apae.secretaria.comum.entidade;

import java.util.Objects;

import org.hibernate.proxy.HibernateProxy;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;

/** Identificador gerado pelo banco (IDENTITY) e igualdade por id, segura com proxies do Hibernate. */
@Getter
@MappedSuperclass
public abstract class EntidadeBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
    public final boolean equals(Object outro) {
        if (this == outro) {
            return true;
        }
        if (outro == null || classeReal(this) != classeReal(outro)) {
            return false;
        }
        return id != null && id.equals(((EntidadeBase) outro).getId());
    }

    @Override
    public final int hashCode() {
        return Objects.hashCode(classeReal(this));
    }

    private static Class<?> classeReal(Object objeto) {
        return objeto instanceof HibernateProxy proxy
                ? proxy.getHibernateLazyInitializer().getPersistentClass()
                : objeto.getClass();
    }
}

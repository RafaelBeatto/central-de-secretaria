package br.org.apae.secretaria.acesso.cargo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Cargo fixo (definido no script SQL). Quanto menor o nível, mais alto na hierarquia. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cargo", schema = "acesso")
public class Cargo {

    public static final String ADMINISTRADOR_SISTEMA = "ADMINISTRADOR_SISTEMA";

    @Id
    private Short id;

    @Column(nullable = false, length = 40, unique = true)
    private String codigo;

    @Column(nullable = false, length = 60)
    private String nome;

    @Column(nullable = false)
    private short nivel;

    public boolean administradorSistema() {
        return ADMINISTRADOR_SISTEMA.equals(codigo);
    }

    /** Verdadeiro se este cargo está acima (nível menor) do outro. */
    public boolean acimaDe(Cargo outro) {
        return nivel < outro.getNivel();
    }
}

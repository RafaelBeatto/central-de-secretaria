package br.org.apae.secretaria.acesso.permissao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Permissão fixa (definida no script SQL), usada como authority nas rotas. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "permissao", schema = "acesso")
public class Permissao {

    @Id
    private Short id;

    @Column(nullable = false, length = 60, unique = true)
    private String codigo;

    @Column(nullable = false, length = 40)
    private String modulo;

    @Column(nullable = false, length = 150)
    private String descricao;
}

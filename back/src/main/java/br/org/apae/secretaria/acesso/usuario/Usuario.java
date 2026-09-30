package br.org.apae.secretaria.acesso.usuario;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.acesso.cargo.Cargo;
import br.org.apae.secretaria.acesso.unidade.Unidade;
import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Pessoa que acessa o sistema. Sempre criada por alguém de cargo superior. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "usuario", schema = "acesso")
public class Usuario extends EntidadeAuditavel {

    @Column(nullable = false, length = Limites.USUARIO_LOGIN)
    private String login;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Column(nullable = false, length = Limites.USUARIO_NOME)
    private String nome;

    @Column(nullable = false, length = Limites.USUARIO_SOBRENOME)
    private String sobrenome;

    @Column(length = Limites.TELEFONE)
    private String telefone;

    @Column(length = Limites.EMAIL)
    private String email;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cargo_id", nullable = false)
    private Cargo cargo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unidade_id", nullable = false)
    private Unidade unidade;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "trocar_senha", nullable = false)
    private boolean trocarSenha = true;

    @Setter(AccessLevel.NONE)
    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    @Column(name = "ultimo_acesso_em")
    private Instant ultimoAcessoEm;

    public Usuario(Long criadoPorId) {
        this.criadoPorId = criadoPorId;
    }

    public String nomeCompleto() {
        return nome + " " + sobrenome;
    }
}

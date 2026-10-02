package br.org.apae.secretaria.empresas;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Empresa (fornecedor), cadastro único por unidade (old/js/04-projetos.js: gerador-empresas). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "empresa", schema = "empresas")
public class Empresa extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter
    @Column(name = "razao_social", nullable = false, length = Limites.EMPRESA_RAZAO_SOCIAL)
    private String razaoSocial;

    @Setter
    @Column(name = "nome_fantasia", length = Limites.EMPRESA_NOME_FANTASIA)
    private String nomeFantasia;

    @Setter
    @Column(length = Limites.CNPJ)
    private String cnpj;

    @Setter
    @Column(length = Limites.TELEFONE)
    private String telefone;

    @Setter
    @Column(length = Limites.EMAIL)
    private String email;

    @Setter
    @Column(length = Limites.EMPRESA_ENDERECO)
    private String endereco;

    @Setter
    @Column(length = Limites.MUNICIPIO)
    private String municipio;

    @Setter
<<<<<<< HEAD
    @Column(columnDefinition = "bpchar(2)", length = Limites.UF)
=======
    @Column(length = Limites.UF)
>>>>>>> 426a94c127d17a98c09e288f8ca7b11985d0744f
    private String uf;

    @Setter
    @Column(length = Limites.RESPONSAVEL)
    private String representante;

    @Setter
    @Column(name = "cpf_representante", length = Limites.CPF)
    private String cpfRepresentante;

    @Setter
    @Column(length = Limites.EMPRESA_OBSERVACAO)
    private String observacao;

    public Empresa(Long unidadeId, String razaoSocial, String nomeFantasia, String cnpj, String telefone,
            String email, String endereco, String municipio, String uf, String representante,
            String cpfRepresentante, String observacao) {
        this.unidadeId = unidadeId;
        this.razaoSocial = razaoSocial;
        this.nomeFantasia = nomeFantasia;
        this.cnpj = cnpj;
        this.telefone = telefone;
        this.email = email;
        this.endereco = endereco;
        this.municipio = municipio;
        this.uf = uf;
        this.representante = representante;
        this.cpfRepresentante = cpfRepresentante;
        this.observacao = observacao;
    }
}

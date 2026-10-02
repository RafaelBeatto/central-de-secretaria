package br.org.apae.secretaria.empresas.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cadastro/edição de empresa (old/js/04-projetos.js: abrirFormEmpresaGlobal). */
public record RequisicaoEmpresa(
        @NotBlank @Size(max = Limites.EMPRESA_RAZAO_SOCIAL) String razaoSocial,
        @Size(max = Limites.EMPRESA_NOME_FANTASIA) String nomeFantasia,
        @Size(max = Limites.CNPJ) String cnpj,
        @Size(max = Limites.TELEFONE) String telefone,
        @Size(max = Limites.EMAIL) String email,
        @Size(max = Limites.EMPRESA_ENDERECO) String endereco,
        @Size(max = Limites.MUNICIPIO) String municipio,
        @Size(max = Limites.UF) String uf,
        @Size(max = Limites.RESPONSAVEL) String representante,
        @Size(max = Limites.CPF) String cpfRepresentante,
        @Size(max = Limites.EMPRESA_OBSERVACAO) String observacao) {
}

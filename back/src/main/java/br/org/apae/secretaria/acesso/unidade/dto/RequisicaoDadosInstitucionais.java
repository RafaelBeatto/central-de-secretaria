package br.org.apae.secretaria.acesso.unidade.dto;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.validacao.Cnpj;
import br.org.apae.secretaria.comum.validacao.Cpf;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cabeçalho/rodapé dos documentos da própria unidade (antiga tela "Dados da instituição"). */
public record RequisicaoDadosInstitucionais(
        @NotBlank @Size(max = Limites.UNIDADE_NOME) String nome,
        @Cnpj @Size(max = Limites.CNPJ) String cnpj,
        @Size(max = Limites.UNIDADE_ENDERECO) String endereco,
        @Size(max = Limites.TELEFONE) String telefone,
        @Email @Size(max = Limites.EMAIL) String email,
        @Size(max = Limites.UNIDADE_CIDADE_UF) String cidadeUf,
        @Size(max = Limites.UNIDADE_SITE) String site,
        @Size(max = Limites.NOME_PESSOA) String presidente,
        @Cpf @Size(max = Limites.CPF) String cpfPresidente,
        @Size(max = Limites.UNIDADE_RODAPE) String rodapeTexto,
        boolean rodapeEndereco,
        boolean rodapeTelefone,
        boolean rodapeEmail,
        boolean rodapeSite,
        boolean rodapeMostrarPagina,
        Long logoArquivoId) {
}

package br.org.apae.secretaria.empresas.dto;

import java.time.Instant;

import br.org.apae.secretaria.empresas.Empresa;

public record EmpresaResposta(
        Long id, String razaoSocial, String nomeFantasia, String cnpj, String telefone, String email, String endereco,
        String municipio, String uf, String representante, String cpfRepresentante, String observacao,
        Instant criadoEm, Instant atualizadoEm) {

    public static EmpresaResposta de(Empresa e) {
        return new EmpresaResposta(e.getId(), e.getRazaoSocial(), e.getNomeFantasia(), e.getCnpj(), e.getTelefone(),
                e.getEmail(), e.getEndereco(), e.getMunicipio(), e.getUf(), e.getRepresentante(),
                e.getCpfRepresentante(), e.getObservacao(), e.getCriadoEm(), e.getAtualizadoEm());
    }
}

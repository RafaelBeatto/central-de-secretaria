package br.org.apae.secretaria.empresas.dto;

import java.time.Instant;
import java.util.List;

import br.org.apae.secretaria.empresas.Empresa;

/**
 * Empresa com os documentos da ficha: a lista precisa deles para mostrar a
 * situação (OK / incompleta / vencido), calculada no front como no antigo.
 */
public record EmpresaResposta(
        Long id, String razaoSocial, String nomeFantasia, String cnpj, String telefone, String email, String endereco,
        String municipio, String uf, String representante, String cpfRepresentante, String observacao,
        List<EmpresaDocumentoResposta> documentos, Instant criadoEm, Instant atualizadoEm) {

    public static EmpresaResposta de(Empresa e, List<EmpresaDocumentoResposta> documentos) {
        return new EmpresaResposta(e.getId(), e.getRazaoSocial(), e.getNomeFantasia(), e.getCnpj(), e.getTelefone(),
                e.getEmail(), e.getEndereco(), e.getMunicipio(), e.getUf(), e.getRepresentante(),
                e.getCpfRepresentante(), e.getObservacao(), documentos, e.getCriadoEm(), e.getAtualizadoEm());
    }
}

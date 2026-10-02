package br.org.apae.secretaria.gerador.dto;

import java.util.List;
import java.util.Map;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.gerador.TipoVinculo;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Respostas do formulário do Gerador. {@code valores} são os campos [MANUAIS], {@code contexto} os {CAMPOS} que
 * o usuário informa (empresa, aluno…). No cadastro vale {@code modeloId}; na edição ele é ignorado.
 */
public record RequisicaoDocumentoGerado(
        Long modeloId,
        @NotNull @Size(max = Limites.GERADOR_CAMPOS_MAXIMO) Map<@Size(max = Limites.GERADOR_CAMPO_NOME) String,
                @Size(max = Limites.GERADOR_CAMPO_VALOR) String> valores,
        @NotNull @Size(max = Limites.GERADOR_CAMPOS_MAXIMO) Map<@Size(max = Limites.GERADOR_CAMPO_NOME) String,
                @Size(max = Limites.GERADOR_CAMPO_VALOR) String> contexto,
        @NotNull @Size(max = Limites.GERADOR_ASSINATURAS_MAXIMO) List<@Size(max = Limites.GERADOR_ASSINATURA_LINHAS_MAXIMO) List<@Size(max = Limites.GERADOR_ASSINATURA_LINHA) String>> assinaturas,
        TipoVinculo vinculoTipo,
        Long vinculoId,
        @Size(max = Limites.GERADOR_VINCULO_ROTULO) String vinculoRotulo) {
}

package br.org.apae.secretaria.acesso.usuario.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

public record RequisicaoAtualizarUsuario(
        @NotBlank @Size(max = Limites.USUARIO_NOME) String nome,
        @NotBlank @Size(max = Limites.USUARIO_SOBRENOME) String sobrenome,
        @Size(max = Limites.TELEFONE) String telefone,
        @Email @Size(max = Limites.EMAIL) String email,
        @NotNull @Past LocalDate dataNascimento,
        @NotNull Short cargoId,
        @NotNull Long unidadeId) implements DadosPessoais {

    @AssertTrue(message = "informe o telefone ou o e-mail")
    public boolean isContatoInformado() {
        return temContato();
    }
}

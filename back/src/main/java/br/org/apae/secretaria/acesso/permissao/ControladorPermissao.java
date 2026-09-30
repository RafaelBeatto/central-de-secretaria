package br.org.apae.secretaria.acesso.permissao;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.dto.MatrizPermissoes;
import br.org.apae.secretaria.acesso.permissao.dto.RequisicaoPermissoesCargo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/permissoes")
@RequiredArgsConstructor
public class ControladorPermissao {

    private final ServicoPermissao servico;

    @GetMapping
    @PreAuthorize(Permissoes.PERMISSAO_LER)
    public MatrizPermissoes matriz() {
        return servico.matriz();
    }

    @PutMapping("/cargos/{cargoId}")
    @PreAuthorize(Permissoes.PERMISSAO_ESCREVER)
    public MatrizPermissoes atualizar(@PathVariable Short cargoId, @Valid @RequestBody RequisicaoPermissoesCargo requisicao) {
        return servico.atualizar(cargoId, requisicao.permissoes());
    }

    /** Remove os ajustes da unidade para o cargo: volta a valer a matriz padrão. */
    @DeleteMapping("/cargos/{cargoId}")
    @PreAuthorize(Permissoes.PERMISSAO_ESCREVER)
    public MatrizPermissoes restaurarPadrao(@PathVariable Short cargoId) {
        return servico.restaurarPadrao(cargoId);
    }
}

package br.org.apae.secretaria.acesso.usuario;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.cargo.dto.CargoResposta;
import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.acesso.usuario.dto.RequisicaoAtualizarUsuario;
import br.org.apae.secretaria.acesso.usuario.dto.RequisicaoCriarUsuario;
import br.org.apae.secretaria.acesso.usuario.dto.RequisicaoRedefinirSenha;
import br.org.apae.secretaria.acesso.usuario.dto.RequisicaoSituacao;
import br.org.apae.secretaria.acesso.usuario.dto.UsuarioDetalhe;
import br.org.apae.secretaria.acesso.usuario.dto.UsuarioResumo;
import br.org.apae.secretaria.comum.web.Pagina;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class ControladorUsuario {

    private final ServicoUsuario servico;

    @GetMapping
    @PreAuthorize(Permissoes.USUARIO_LER)
    public Pagina<UsuarioResumo> listar(@RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = { "nome", "sobrenome" }, direction = Sort.Direction.ASC) Pageable paginacao) {
        return servico.listar(busca, paginacao);
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.USUARIO_LER)
    public UsuarioDetalhe detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @GetMapping("/cargos-atribuiveis")
    @PreAuthorize(Permissoes.USUARIO_ESCREVER)
    public List<CargoResposta> cargosAtribuiveis(@RequestParam(required = false) Long unidadeId) {
        return servico.cargosAtribuiveis(unidadeId).stream().map(CargoResposta::de).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.USUARIO_ESCREVER)
    public UsuarioDetalhe criar(@Valid @RequestBody RequisicaoCriarUsuario requisicao) {
        return servico.criar(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.USUARIO_ESCREVER)
    public UsuarioDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoAtualizarUsuario requisicao) {
        return servico.atualizar(id, requisicao);
    }

    @PatchMapping("/{id}/situacao")
    @PreAuthorize(Permissoes.USUARIO_ESCREVER)
    public UsuarioDetalhe alterarSituacao(@PathVariable Long id, @Valid @RequestBody RequisicaoSituacao requisicao) {
        return servico.alterarSituacao(id, requisicao.ativo());
    }

    @PutMapping("/{id}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.USUARIO_ESCREVER)
    public void redefinirSenha(@PathVariable Long id, @Valid @RequestBody RequisicaoRedefinirSenha requisicao) {
        servico.redefinirSenha(id, requisicao.senhaProvisoria());
    }
}

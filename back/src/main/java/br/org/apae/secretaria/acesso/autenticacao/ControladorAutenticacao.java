package br.org.apae.secretaria.acesso.autenticacao;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.autenticacao.dto.RequisicaoEntrar;
import br.org.apae.secretaria.acesso.autenticacao.dto.RequisicaoRenovar;
import br.org.apae.secretaria.acesso.autenticacao.dto.RequisicaoTrocarSenha;
import br.org.apae.secretaria.acesso.autenticacao.dto.RespostaSessao;
import br.org.apae.secretaria.acesso.autenticacao.dto.UsuarioSessao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/autenticacao")
@RequiredArgsConstructor
public class ControladorAutenticacao {

    private final ServicoAutenticacao servico;

    @PostMapping("/entrar")
    public RespostaSessao entrar(@Valid @RequestBody RequisicaoEntrar requisicao) {
        return servico.entrar(requisicao.login(), requisicao.senha());
    }

    @PostMapping("/renovar")
    public RespostaSessao renovar(@Valid @RequestBody RequisicaoRenovar requisicao) {
        return servico.renovar(requisicao.tokenRenovacao());
    }

    @PostMapping("/sair")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sair(@Valid @RequestBody RequisicaoRenovar requisicao) {
        servico.sair(requisicao.tokenRenovacao());
    }

    @GetMapping("/eu")
    public UsuarioSessao eu() {
        return servico.eu();
    }

    @PutMapping("/senha")
    public UsuarioSessao trocarSenha(@Valid @RequestBody RequisicaoTrocarSenha requisicao) {
        return servico.trocarSenha(requisicao);
    }
}

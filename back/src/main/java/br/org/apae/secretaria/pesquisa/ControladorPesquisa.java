package br.org.apae.secretaria.pesquisa;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.pesquisa.dto.ResultadoPesquisa;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/pesquisa")
@RequiredArgsConstructor
public class ControladorPesquisa {

    private final ServicoPesquisa pesquisa;

    /** Aberto a qualquer usuário autenticado: cada tipo só entra se ele tiver a permissão do módulo. */
    @GetMapping
    public List<ResultadoPesquisa> pesquisar(@RequestParam String termo) {
        return pesquisa.pesquisar(termo);
    }
}

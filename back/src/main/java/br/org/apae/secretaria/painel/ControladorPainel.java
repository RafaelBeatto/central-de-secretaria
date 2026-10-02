package br.org.apae.secretaria.painel;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.painel.dto.ExtrasPainel;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/painel")
@RequiredArgsConstructor
public class ControladorPainel {

    private final ServicoPainel painel;

    /** Aberto a qualquer usuário autenticado: cada parte só vem se ele tiver a permissão do módulo. */
    @GetMapping("/extras")
    public ExtrasPainel extras() {
        return painel.extras();
    }
}

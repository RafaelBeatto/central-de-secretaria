package br.org.apae.secretaria.vinculos;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.vinculos.dto.Vinculado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;

/** As permissões são conferidas no serviço, pois dependem do tipo de registro (tarefa, documento, empresa, execução). */
@RestController
@RequestMapping("/api/vinculos")
@RequiredArgsConstructor
public class ControladorVinculo {

    private final ServicoVinculo vinculos;

    public record RequisicaoVinculo(@NotNull TipoRegistro tipo, @NotNull Long id, @NotNull TipoRegistro alvoTipo,
            @NotNull Long alvoId) {
    }

    @GetMapping
    public List<Vinculado> doRegistro(@RequestParam TipoRegistro tipo, @RequestParam Long id) {
        return vinculos.doRegistro(tipo, id);
    }

    @GetMapping("/opcoes")
    public List<Vinculado> opcoes(@RequestParam TipoRegistro tipo, @RequestParam Long id,
            @RequestParam TipoRegistro alvo) {
        return vinculos.opcoes(tipo, id, alvo);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<Vinculado> adicionar(@Valid @RequestBody RequisicaoVinculo r) {
        return vinculos.adicionar(r.tipo(), r.id(), r.alvoTipo(), r.alvoId());
    }

    @DeleteMapping
    public List<Vinculado> remover(@RequestParam TipoRegistro tipo, @RequestParam Long id,
            @RequestParam TipoRegistro alvoTipo, @RequestParam Long alvoId) {
        return vinculos.remover(tipo, id, alvoTipo, alvoId);
    }
}

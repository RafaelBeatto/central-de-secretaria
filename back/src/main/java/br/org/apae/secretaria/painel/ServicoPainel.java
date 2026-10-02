package br.org.apae.secretaria.painel;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.atendimentos.ServicoAtendimento;
import br.org.apae.secretaria.painel.dto.ExtrasPainel;
import br.org.apae.secretaria.projetos.ServicoItensExecucao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import lombok.RequiredArgsConstructor;

/** Junta, numa só chamada, as pendências que dependem de consultas próprias de cada módulo. */
@Service
@RequiredArgsConstructor
public class ServicoPainel {

    private final ServicoAtendimento atendimentos;
    private final ServicoItensExecucao itensExecucao;
    private final ContextoSeguranca contexto;

    @Transactional(readOnly = true)
    public ExtrasPainel extras() {
        var usuario = contexto.usuario();
        boolean atendimento = usuario.possui("ATENDIMENTO_LER");
        boolean projeto = usuario.possui("PROJETO_LER");
        return new ExtrasPainel(
                atendimento ? atendimentos.semPresenca() : List.of(),
                atendimento ? atendimentos.alunosComFaltasSeguidas() : List.of(),
                projeto ? itensExecucao.pendenciasAbertas() : List.of());
    }
}

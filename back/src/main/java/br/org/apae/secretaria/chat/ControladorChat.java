package br.org.apae.secretaria.chat;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.chat.dto.ContatoChat;
import br.org.apae.secretaria.chat.dto.ConversaResumo;
import br.org.apae.secretaria.chat.dto.MensagemResposta;
import br.org.apae.secretaria.chat.dto.RequisicaoEnviarMensagem;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Chat da tela inicial. Leitura e abertura de conversas por REST; o envio pode
 * ser por REST ou pelo WebSocket (ver ControladorChatWebSocket). A entrega em
 * tempo real sai sempre pelo WebSocket em /user/queue/chat.
 */
@RestController
@RequestMapping("/api/chat")
@PreAuthorize(Permissoes.CHAT_USAR)
@RequiredArgsConstructor
public class ControladorChat {

    private final ServicoChat servico;
    private final ContextoSeguranca contexto;

    @GetMapping("/contatos")
    public List<ContatoChat> contatos() {
        return servico.contatos(contexto.usuario());
    }

    @GetMapping("/conversas")
    public List<ConversaResumo> conversas() {
        return servico.conversas(contexto.usuario());
    }

    @PostMapping("/conversas/com/{usuarioId}")
    public ConversaResumo abrir(@PathVariable Long usuarioId) {
        return servico.abrir(contexto.usuario(), usuarioId);
    }

    @GetMapping("/conversas/{conversaId}/mensagens")
    public List<MensagemResposta> mensagens(@PathVariable Long conversaId, @RequestParam(required = false) Long antesDeId) {
        return servico.mensagens(contexto.usuario(), conversaId, antesDeId);
    }

    @PostMapping("/mensagens")
    @ResponseStatus(HttpStatus.CREATED)
    public MensagemResposta enviar(@Valid @RequestBody RequisicaoEnviarMensagem requisicao) {
        return servico.enviar(contexto.usuario(), requisicao.conversaId(), requisicao.texto());
    }

    @PostMapping("/conversas/{conversaId}/lidas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarLidas(@PathVariable Long conversaId) {
        servico.marcarLidas(contexto.usuario(), conversaId);
    }

}

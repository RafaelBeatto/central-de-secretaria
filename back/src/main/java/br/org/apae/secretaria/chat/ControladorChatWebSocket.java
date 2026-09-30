package br.org.apae.secretaria.chat;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import br.org.apae.secretaria.chat.dto.RequisicaoEnviarMensagem;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

/**
 * Mensagens STOMP do chat. A autenticação e a permissão CHAT_USAR já foram
 * verificadas no CONNECT (ConfiguracaoWebSocket); aqui o usuário vem do Principal.
 */
@Controller
@RequiredArgsConstructor
public class ControladorChatWebSocket {

    private final ServicoChat servico;

    @MessageMapping("/chat.enviar")
    public void enviar(@Payload RequisicaoEnviarMensagem requisicao, Principal principal) {
        servico.enviar(usuarioDo(principal), requisicao.conversaId(), requisicao.texto());
    }

    @MessageMapping("/chat.lidas")
    public void marcarLidas(@Payload Long conversaId, Principal principal) {
        servico.marcarLidas(usuarioDo(principal), conversaId);
    }

    /** Erros voltam só para quem enviou, em /user/queue/erros. */
    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/erros", broadcast = false)
    public String erro(RuntimeException excecao) {
        return excecao.getMessage();
    }

    private static UsuarioAutenticado usuarioDo(Principal principal) {
        return (UsuarioAutenticado) ((Authentication) principal).getPrincipal();
    }
}

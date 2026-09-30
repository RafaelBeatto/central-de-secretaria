package br.org.apae.secretaria.configuracao;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import br.org.apae.secretaria.seguranca.ConversorJwtAutenticacao;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

/**
 * WebSocket do chat (STOMP em /ws).
 * O cliente autentica no CONNECT com o cabeçalho "Authorization: Bearer <token>";
 * só pode assinar as próprias filas (/user/queue/...) e só envia para /app/...
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class ConfiguracaoWebSocket implements WebSocketMessageBrokerConfigurer {

    private final PropriedadesAplicacao propriedades;
    private final JwtDecoder decodificadorJwt;
    private final ConversorJwtAutenticacao conversorJwt;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registro) {
        registro.addEndpoint("/ws")
                .setAllowedOrigins(propriedades.cors().origensPermitidas().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registro) {
        registro.enableSimpleBroker("/queue");
        registro.setApplicationDestinationPrefixes("/app");
        registro.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registro) {
        registro.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> mensagem, MessageChannel canal) {
                StompHeaderAccessor cabecalhos = MessageHeaderAccessor.getAccessor(mensagem, StompHeaderAccessor.class);
                if (cabecalhos == null || cabecalhos.getCommand() == null) {
                    return mensagem;
                }
                switch (cabecalhos.getCommand()) {
                    case CONNECT -> autenticar(cabecalhos);
                    case SUBSCRIBE -> exigirFilaPropria(cabecalhos);
                    case SEND -> exigirUsuario(cabecalhos);
                    default -> { }
                }
                return mensagem;
            }
        });
    }

    private void autenticar(StompHeaderAccessor cabecalhos) {
        String autorizacao = cabecalhos.getFirstNativeHeader("Authorization");
        if (autorizacao == null || !autorizacao.startsWith("Bearer ")) {
            throw new MessagingException("Não autenticado.");
        }
        try {
            UsuarioAutenticado usuario = conversorJwt.autenticar(decodificadorJwt.decode(autorizacao.substring(7)));
            if (usuario.trocarSenha() || !usuario.possui("CHAT_USAR")) {
                throw new MessagingException("Sem permissão para usar o chat.");
            }
            cabecalhos.setUser(new UsernamePasswordAuthenticationToken(usuario, null,
                    ConversorJwtAutenticacao.autoridades(usuario)));
        } catch (JwtException e) {
            throw new MessagingException("Sessão expirada.");
        }
    }

    private static void exigirFilaPropria(StompHeaderAccessor cabecalhos) {
        exigirUsuario(cabecalhos);
        String destino = cabecalhos.getDestination();
        if (destino == null || !destino.startsWith("/user/queue/")) {
            throw new MessagingException("Destino não permitido.");
        }
    }

    private static void exigirUsuario(StompHeaderAccessor cabecalhos) {
        if (cabecalhos.getUser() == null && cabecalhos.getCommand() != StompCommand.CONNECT) {
            throw new MessagingException("Não autenticado.");
        }
    }
}

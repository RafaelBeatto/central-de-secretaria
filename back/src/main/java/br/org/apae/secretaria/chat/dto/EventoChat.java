package br.org.apae.secretaria.chat.dto;

/**
 * Evento entregue pelo WebSocket em /user/queue/chat.
 * MENSAGEM: chegou (ou foi enviada por outra aba) uma mensagem.
 * LIDAS: o outro participante leu as mensagens da conversa.
 */
public record EventoChat(Tipo tipo, Long conversaId, MensagemResposta mensagem) {

    public enum Tipo { MENSAGEM, LIDAS }

    public static EventoChat mensagem(MensagemResposta mensagem) {
        return new EventoChat(Tipo.MENSAGEM, mensagem.conversaId(), mensagem);
    }

    public static EventoChat lidas(Long conversaId) {
        return new EventoChat(Tipo.LIDAS, conversaId, null);
    }
}

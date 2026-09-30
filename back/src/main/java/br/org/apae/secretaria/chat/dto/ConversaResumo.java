package br.org.apae.secretaria.chat.dto;

/** Item da lista de conversas: com quem, última mensagem e quantas não foram lidas. */
public record ConversaResumo(Long id, ContatoChat outroUsuario, MensagemResposta ultimaMensagem, long naoLidas) {
}

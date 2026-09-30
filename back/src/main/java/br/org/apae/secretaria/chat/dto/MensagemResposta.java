package br.org.apae.secretaria.chat.dto;

import java.time.Instant;

import br.org.apae.secretaria.chat.Mensagem;

public record MensagemResposta(Long id, Long conversaId, Long remetenteId, String texto, Instant enviadaEm, Instant lidaEm) {

    public static MensagemResposta de(Mensagem m) {
        return new MensagemResposta(m.getId(), m.getConversaId(), m.getRemetenteId(), m.getTexto(), m.getEnviadaEm(),
                m.getLidaEm());
    }
}

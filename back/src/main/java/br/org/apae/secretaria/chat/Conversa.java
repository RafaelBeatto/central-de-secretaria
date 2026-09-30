package br.org.apae.secretaria.chat;

import java.time.Instant;

import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Conversa entre exatamente duas pessoas da mesma unidade.
 * O par é gravado sempre com o menor id em "usuarioA", o que (com a restrição
 * única no banco) impede duas conversas entre as mesmas pessoas.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "conversa", schema = "chat")
public class Conversa extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(name = "usuario_a_id", nullable = false, updatable = false)
    private Long usuarioAId;

    @Column(name = "usuario_b_id", nullable = false, updatable = false)
    private Long usuarioBId;

    @Column(name = "ultima_mensagem_em")
    private Instant ultimaMensagemEm;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    static Conversa entre(Long unidadeId, Long usuario1, Long usuario2) {
        Conversa conversa = new Conversa();
        conversa.unidadeId = unidadeId;
        conversa.usuarioAId = Math.min(usuario1, usuario2);
        conversa.usuarioBId = Math.max(usuario1, usuario2);
        conversa.criadoEm = Instant.now();
        return conversa;
    }

    boolean participa(Long usuarioId) {
        return usuarioAId.equals(usuarioId) || usuarioBId.equals(usuarioId);
    }

    Long outroParticipante(Long usuarioId) {
        return usuarioAId.equals(usuarioId) ? usuarioBId : usuarioAId;
    }

    void registrarMensagem(Instant momento) {
        ultimaMensagemEm = momento;
    }
}

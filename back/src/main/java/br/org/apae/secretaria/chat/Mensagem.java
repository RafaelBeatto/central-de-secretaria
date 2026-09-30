package br.org.apae.secretaria.chat;

import java.time.Instant;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "mensagem", schema = "chat")
public class Mensagem extends EntidadeBase {

    @Column(name = "conversa_id", nullable = false, updatable = false)
    private Long conversaId;

    @Column(name = "remetente_id", nullable = false, updatable = false)
    private Long remetenteId;

    @Column(nullable = false, length = Limites.MENSAGEM_TEXTO, updatable = false)
    private String texto;

    @Column(name = "enviada_em", nullable = false, updatable = false)
    private Instant enviadaEm;

    @Column(name = "lida_em")
    private Instant lidaEm;

    Mensagem(Long conversaId, Long remetenteId, String texto) {
        this.conversaId = conversaId;
        this.remetenteId = remetenteId;
        this.texto = texto;
        this.enviadaEm = Instant.now();
    }
}

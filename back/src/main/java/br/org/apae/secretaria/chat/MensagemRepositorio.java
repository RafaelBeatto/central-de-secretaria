package br.org.apae.secretaria.chat;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface MensagemRepositorio extends JpaRepository<Mensagem, Long> {

    /** Mensagens mais recentes primeiro; "antesDeId" pagina para trás (rolagem para cima). */
    @Query("""
            select m from Mensagem m
             where m.conversaId = :conversaId and (:antesDeId = 0 or m.id < :antesDeId)
             order by m.id desc
            """)
    List<Mensagem> recentes(Long conversaId, long antesDeId, Pageable limite);

    Optional<Mensagem> findFirstByConversaIdOrderByIdDesc(Long conversaId);

    /** Quantidade de mensagens não lidas por conversa: [conversaId, total]. */
    @Query("""
            select m.conversaId, count(m) from Mensagem m
             where m.conversaId in :conversas and m.remetenteId <> :usuarioId and m.lidaEm is null
             group by m.conversaId
            """)
    List<Object[]> naoLidasPorConversa(Collection<Long> conversas, Long usuarioId);

    @Modifying
    @Query("""
            update Mensagem m set m.lidaEm = :agora
             where m.conversaId = :conversaId and m.remetenteId <> :leitorId and m.lidaEm is null
            """)
    int marcarLidas(Long conversaId, Long leitorId, Instant agora);
}

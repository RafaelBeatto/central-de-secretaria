package br.org.apae.secretaria.chat;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ConversaRepositorio extends JpaRepository<Conversa, Long> {

    Optional<Conversa> findByUsuarioAIdAndUsuarioBId(Long usuarioAId, Long usuarioBId);

    @Modifying
    @Query(value = """
            insert into chat.conversa (unidade_id, usuario_a_id, usuario_b_id)
            values (:unidadeId, :usuarioAId, :usuarioBId)
            on conflict (usuario_a_id, usuario_b_id) do nothing
            """, nativeQuery = true)
    void inserirSeNaoExistir(Long unidadeId, Long usuarioAId, Long usuarioBId);

    @Query("""
            select c from Conversa c
             where c.usuarioAId = :usuarioId or c.usuarioBId = :usuarioId
             order by c.ultimaMensagemEm desc nulls last, c.criadoEm desc
            """)
    List<Conversa> doUsuario(Long usuarioId);
}

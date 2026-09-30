package br.org.apae.secretaria.acesso.autenticacao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface TokenRenovacaoRepositorio extends JpaRepository<TokenRenovacao, Long> {

    Optional<TokenRenovacao> findByTokenHash(String tokenHash);

    /** Encerra todas as sessões do usuário (senha trocada, usuário desativado ou token roubado). */
    @Modifying
    @Query("update TokenRenovacao t set t.revogado = true where t.usuarioId = :usuarioId and t.revogado = false")
    int revogarTodos(Long usuarioId);
}

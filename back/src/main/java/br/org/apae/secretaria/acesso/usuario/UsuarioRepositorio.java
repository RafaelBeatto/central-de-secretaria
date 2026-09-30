package br.org.apae.secretaria.acesso.usuario;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

    @EntityGraph(attributePaths = { "cargo", "unidade" })
    Optional<Usuario> findByLoginIgnoreCase(String login);

    @EntityGraph(attributePaths = { "cargo", "unidade" })
    Optional<Usuario> findComCargoEUnidadeById(Long id);

    boolean existsByLoginIgnoreCase(String login);

    boolean existsByLoginIgnoreCaseAndIdNot(String login, Long id);

    /** "busca" vazia traz todos da unidade. */
    @EntityGraph(attributePaths = { "cargo", "unidade" })
    @Query("""
            select u from Usuario u
             where u.unidade.id = :unidadeId
               and lower(concat(u.nome, ' ', u.sobrenome, ' ', u.login)) like lower(concat('%', :busca, '%'))
            """)
    Page<Usuario> buscar(Long unidadeId, String busca, Pageable paginacao);

    /** Colegas de unidade disponíveis para conversar no chat. */
    @EntityGraph(attributePaths = { "cargo" })
    List<Usuario> findByUnidadeIdAndAtivoTrueAndIdNotOrderByNomeAscSobrenomeAsc(Long unidadeId, Long idExcluido);
}

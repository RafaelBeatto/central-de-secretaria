package br.org.apae.secretaria.acesso.unidade;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UnidadeRepositorio extends JpaRepository<Unidade, Long> {

    /** A própria unidade e todas as subordinadas (em qualquer nível), ordenadas pela árvore. */
    @Query("select u from Unidade u where u.caminho like concat(:caminho, '%') order by u.caminho")
    List<Unidade> buscarArvore(String caminho);

    boolean existsByUnidadePaiIdAndNomeIgnoreCase(Long unidadePaiId, String nome);

    boolean existsByUnidadePaiIdAndNomeIgnoreCaseAndIdNot(Long unidadePaiId, String nome, Long id);
}

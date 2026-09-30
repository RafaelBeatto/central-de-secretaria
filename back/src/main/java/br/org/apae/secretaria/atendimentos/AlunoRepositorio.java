package br.org.apae.secretaria.atendimentos;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AlunoRepositorio extends JpaRepository<Aluno, Long> {

    Optional<Aluno> findByUnidadeIdAndNomeIgnoreCase(Long unidadeId, String nome);

    List<Aluno> findByUnidadeIdOrderByNomeAsc(Long unidadeId);
}

package br.org.apae.secretaria.atendimentos;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfissionalRepositorio extends JpaRepository<Profissional, Long> {

    Optional<Profissional> findByUnidadeIdAndNomeIgnoreCase(Long unidadeId, String nome);

    Optional<Profissional> findByUnidadeIdAndUsuarioId(Long unidadeId, Long usuarioId);

    List<Profissional> findByUnidadeIdOrderByNomeAsc(Long unidadeId);
}

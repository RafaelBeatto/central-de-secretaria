package br.org.apae.secretaria.projetos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoRepositorio extends JpaRepository<MovimentacaoRecurso, Long> {
    List<MovimentacaoRecurso> findByRecursoIdOrderByCriadoEmDescIdDesc(Long recursoId);
}

package br.org.apae.secretaria.atendimentos;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AtendimentoRepositorio extends JpaRepository<Atendimento, Long> {

    String BASE = "select a from Atendimento a join fetch a.aluno join fetch a.profissional ";

    @Query(BASE + "where a.unidadeId = :unidadeId and a.data between :inicio and :fim order by a.data, a.horario")
    List<Atendimento> porPeriodo(Long unidadeId, LocalDate inicio, LocalDate fim);

    @Query(BASE + """
             where a.unidadeId = :unidadeId and a.profissional.id = :profissionalId
               and a.data between :inicio and :fim
             order by a.data, a.horario
            """)
    List<Atendimento> porPeriodoDoProfissional(Long unidadeId, Long profissionalId, LocalDate inicio, LocalDate fim);

    @Query(BASE + "where a.aluno.id = :alunoId order by a.data desc, a.horario desc")
    List<Atendimento> porAluno(Long alunoId);

    @Query(BASE + "where a.aluno.id = :alunoId and a.profissional.id = :profissionalId order by a.data desc, a.horario desc")
    List<Atendimento> porAlunoEProfissional(Long alunoId, Long profissionalId);

    @Query(BASE + "where a.profissional.id = :profissionalId order by a.data desc, a.horario desc")
    List<Atendimento> porProfissional(Long profissionalId);

    /** Painel: atendimentos já ocorridos (hoje ou antes) sem presença marcada, os mais antigos primeiro. */
    @Query(BASE + """
             where a.unidadeId = :unidadeId and a.data <= :hoje and a.presenca = :semPresenca and a.remarcado = false
             order by a.data, a.horario
            """)
    List<Atendimento> semPresenca(Long unidadeId, LocalDate hoje, Presenca semPresenca);

    /** Painel: presenças já decididas desde uma data, do mais novo ao mais velho (para as faltas seguidas). */
    @Query(BASE + """
             where a.unidadeId = :unidadeId and a.data between :desde and :hoje and a.remarcado = false
               and a.presenca <> :semPresenca
             order by a.data desc, a.horario desc
            """)
    List<Atendimento> decididosDesde(Long unidadeId, LocalDate desde, LocalDate hoje, Presenca semPresenca);

    Optional<Atendimento> findByRemarcadoDeId(Long id);

    List<Atendimento> findBySerieIdAndDataGreaterThanEqualAndPresencaAndRemarcadoFalse(UUID serieId, LocalDate data,
            Presenca presenca);

    long countByAlunoId(Long alunoId);

    long countByProfissionalId(Long profissionalId);

    /** Ao mesclar cadastros: os atendimentos do aluno de origem passam para o destino. */
    @Modifying
    @Query("update Atendimento a set a.aluno.id = :destinoId where a.aluno.id = :origemId")
    void reatribuirAluno(Long origemId, Long destinoId);

    @Modifying
    @Query("update Atendimento a set a.profissional.id = :destinoId where a.profissional.id = :origemId")
    void reatribuirProfissional(Long origemId, Long destinoId);
}

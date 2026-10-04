package br.org.apae.secretaria.relatorios.profissional;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.org.apae.secretaria.relatorios.profissional.dto.ProfissionalCentral;

/**
 * Filtros opcionais sem {@code null} (o PostgreSQL não infere o tipo): texto vazio = todos e as datas
 * chegam sempre preenchidas pelo serviço. {@code inicioMin/inicioMax} limitam o início do período (ano);
 * {@code de/ate} pegam todo relatório cujo período cruza o intervalo.
 */
public interface RelatorioProfissionalRepositorio extends JpaRepository<RelatorioProfissional, Long> {

    boolean existsByArquivoId(Long arquivoId);

    List<RelatorioProfissional> findByUsuarioIdOrderByPeriodoInicioDescEnviadoEmDesc(Long usuarioId);

    @Query("""
            select r from RelatorioProfissional r
             where r.usuarioId = :usuarioId
               and r.unidadeId = :unidadeId
               and r.periodoInicio between :inicioMin and :inicioMax
               and r.periodoFim >= :de and r.periodoInicio <= :ate
               and (:status = '' or cast(r.status as string) = :status)
             order by r.periodoInicio desc, r.enviadoEm desc
            """)
    List<RelatorioProfissional> filtrar(@Param("usuarioId") Long usuarioId, @Param("unidadeId") Long unidadeId,
            @Param("inicioMin") LocalDate inicioMin, @Param("inicioMax") LocalDate inicioMax,
            @Param("de") LocalDate de, @Param("ate") LocalDate ate, @Param("status") String status);

    /**
     * Professores e profissionais da unidade com a quantidade de relatórios dentro dos filtros.
     * {@code minimo} = 0 mostra também quem não enviou nada; 1 só quem tem relatório (quando há filtro ativo).
     * Quem foi desativado só aparece se tiver relatório.
     */
    @Query("""
            select new br.org.apae.secretaria.relatorios.profissional.dto.ProfissionalCentral(
                       u.id, concat(u.nome, ' ', u.sobrenome), c.nome,
                       count(case when cast(r.status as string) = 'ENTREGUE' then r.id end),
                       count(case when cast(r.status as string) = 'PENDENTE' then r.id end))
              from Usuario u
              join u.cargo c
              left join RelatorioProfissional r
                     on r.usuarioId = u.id and r.unidadeId = :unidadeId
                    and r.periodoInicio between :inicioMin and :inicioMax
                    and r.periodoFim >= :de and r.periodoInicio <= :ate
                    and (:status = '' or cast(r.status as string) = :status)
             where u.unidade.id = :unidadeId
               and c.codigo in ('PROFESSOR', 'PROFISSIONAL')
               and lower(concat(u.nome, ' ', u.sobrenome)) like lower(concat('%', :busca, '%'))
             group by u.id, u.nome, u.sobrenome, c.nome, u.ativo
            having count(r.id) >= :minimo and (u.ativo = true or count(r.id) > 0)
             order by u.nome, u.sobrenome
            """)
    List<ProfissionalCentral> profissionaisComTotal(@Param("unidadeId") Long unidadeId,
            @Param("busca") String busca, @Param("inicioMin") LocalDate inicioMin,
            @Param("inicioMax") LocalDate inicioMax, @Param("de") LocalDate de, @Param("ate") LocalDate ate,
            @Param("status") String status, @Param("minimo") long minimo);
}

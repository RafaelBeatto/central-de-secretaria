package br.org.apae.secretaria.sistema.historico;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;

public interface HistoricoRepositorio extends JpaRepository<Historico, Long> {

    /** Histórico de um registro (painel de detalhe), mais recentes primeiro. */
    @Query("""
            select new br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta(
                   h.id, h.modulo, h.acao, h.descricao, h.refTipo, h.refId, concat(u.nome, ' ', u.sobrenome), h.criadoEm)
              from Historico h left join Usuario u on u.id = h.usuarioId
             where h.unidadeId = :unidadeId and h.refTipo = :refTipo and h.refId = :refId
             order by h.criadoEm desc, h.id desc
            """)
    List<HistoricoResposta> doRegistro(Long unidadeId, String refTipo, Long refId, Pageable limite);

    /** Histórico de um registro e dos registros filhos dele (ex.: recurso e as execuções). */
    @Query("""
            select new br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta(
                   h.id, h.modulo, h.acao, h.descricao, h.refTipo, h.refId, concat(u.nome, ' ', u.sobrenome), h.criadoEm)
              from Historico h left join Usuario u on u.id = h.usuarioId
             where h.unidadeId = :unidadeId
               and ((h.refTipo = :refTipo and h.refId = :refId) or (h.refTipo = :filhosTipo and h.refId in :filhosIds))
             order by h.criadoEm desc, h.id desc
            """)
    List<HistoricoResposta> doRegistroEFilhos(Long unidadeId, String refTipo, Long refId, String filhosTipo,
            Collection<Long> filhosIds, Pageable limite);

    /** Relatório: id e momento das ações de um tipo sobre registros de um tipo, no intervalo [de, ate). */
    @Query("""
            select h.refId, h.criadoEm from Historico h
             where h.unidadeId = :unidadeId and h.modulo = :modulo and h.acao = :acao and h.refTipo = :refTipo
               and h.criadoEm >= :de and h.criadoEm < :ate
            """)
    List<Object[]> acoesSobre(Long unidadeId, ModuloHistorico modulo, AcaoHistorico acao, String refTipo,
            java.time.Instant de, java.time.Instant ate);

    /** Tela Histórico: ações da unidade num intervalo, mais recentes primeiro. */
    @Query("""
            select new br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta(
                   h.id, h.modulo, h.acao, h.descricao, h.refTipo, h.refId, concat(u.nome, ' ', u.sobrenome), h.criadoEm)
              from Historico h left join Usuario u on u.id = h.usuarioId
             where h.unidadeId = :unidadeId and h.criadoEm >= :desde and h.criadoEm < :ate
             order by h.criadoEm desc, h.id desc
            """)
    List<HistoricoResposta> doPeriodo(Long unidadeId, java.time.Instant desde, java.time.Instant ate, Pageable limite);
}

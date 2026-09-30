package br.org.apae.secretaria.sistema.historico;

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
}

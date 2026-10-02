package br.org.apae.secretaria.sistema.historico;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Registra o que cada usuário fez. Roda na mesma transação da operação:
 * se a operação falhar, o registro também não fica.
 */
@Service
@RequiredArgsConstructor
public class ServicoHistorico {

    private static final int LIMITE_DO_REGISTRO = 30;

    private final HistoricoRepositorio repositorio;
    private final ContextoSeguranca contexto;

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrar(ModuloHistorico modulo, AcaoHistorico acao, String descricao, String refTipo, Long refId) {
        UsuarioAutenticado usuario = contexto.usuario();
        repositorio.save(new Historico(usuario.unidadeId(), usuario.id(), modulo, acao, descricao, refTipo, refId));
    }

    /**
     * Últimas ações sobre um registro. Quem chama já validou que o registro está
     * no alcance do usuário e informa a unidade dona dele.
     */
    @Transactional(readOnly = true)
    public List<HistoricoResposta> doRegistro(Long unidadeId, String refTipo, Long refId) {
        return repositorio.doRegistro(unidadeId, refTipo, refId, PageRequest.of(0, LIMITE_DO_REGISTRO));
    }

    /** Ações sobre um registro e os filhos dele, juntas (até 60, como a linha do tempo do recurso no antigo). */
    @Transactional(readOnly = true)
    public List<HistoricoResposta> doRegistroEFilhos(Long unidadeId, String refTipo, Long refId, String filhosTipo,
            Collection<Long> filhosIds) {
        Collection<Long> ids = filhosIds.isEmpty() ? List.of(-1L) : filhosIds;
        return repositorio.doRegistroEFilhos(unidadeId, refTipo, refId, filhosTipo, ids, PageRequest.of(0, 60));
    }
}

package br.org.apae.secretaria.chat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.usuario.Usuario;
import br.org.apae.secretaria.acesso.usuario.UsuarioRepositorio;
import br.org.apae.secretaria.chat.dto.ContatoChat;
import br.org.apae.secretaria.chat.dto.ConversaResumo;
import br.org.apae.secretaria.chat.dto.EventoChat;
import br.org.apae.secretaria.chat.dto.MensagemResposta;
import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.Transacoes;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

/**
 * Regras do chat: conversa sempre entre duas pessoas, ambas ativas e da mesma unidade.
 * Recebe o usuário explicitamente porque é chamado tanto por REST quanto pelo WebSocket.
 */
@Service
@RequiredArgsConstructor
public class ServicoChat {

    public static final String DESTINO_USUARIO = "/queue/chat";
    private static final int LIMITE_MENSAGENS = 50;

    private final ConversaRepositorio conversas;
    private final MensagemRepositorio mensagens;
    private final UsuarioRepositorio usuarios;
    private final SimpMessagingTemplate mensageiro;

    @Transactional(readOnly = true)
    public List<ContatoChat> contatos(UsuarioAutenticado eu) {
        return usuarios.findByUnidadeIdAndAtivoTrueAndIdNotOrderByNomeAscSobrenomeAsc(eu.unidadeId(), eu.id())
                .stream().map(ContatoChat::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ConversaResumo> conversas(UsuarioAutenticado eu) {
        List<Conversa> lista = conversas.doUsuario(eu.id());
        if (lista.isEmpty()) {
            return List.of();
        }
        List<Long> ids = lista.stream().map(Conversa::getId).toList();
        Map<Long, Long> naoLidas = mensagens.naoLidasPorConversa(ids, eu.id()).stream()
                .collect(Collectors.toMap(linha -> (Long) linha[0], linha -> (Long) linha[1]));
        Map<Long, Usuario> outros = usuarios.findAllById(lista.stream().map(c -> c.outroParticipante(eu.id())).toList())
                .stream().collect(Collectors.toMap(Usuario::getId, Function.identity()));
        return lista.stream()
                .filter(c -> outros.containsKey(c.outroParticipante(eu.id())))
                .map(c -> new ConversaResumo(c.getId(), ContatoChat.de(outros.get(c.outroParticipante(eu.id()))),
                        mensagens.findFirstByConversaIdOrderByIdDesc(c.getId()).map(MensagemResposta::de).orElse(null),
                        naoLidas.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    /** Abre (ou reaproveita) a conversa com um colega da mesma unidade. */
    @Transactional
    public ConversaResumo abrir(UsuarioAutenticado eu, Long outroUsuarioId) {
        if (outroUsuarioId.equals(eu.id())) {
            throw new RegraNegocioExcecao("Escolha outra pessoa para conversar.");
        }
        Usuario outro = colegaAtivo(eu, outroUsuarioId);
        Conversa conversa = conversas.findByUsuarioAIdAndUsuarioBId(Math.min(eu.id(), outroUsuarioId), Math.max(eu.id(), outroUsuarioId))
                .orElseGet(() -> criar(eu, outroUsuarioId));
        return new ConversaResumo(conversa.getId(), ContatoChat.de(outro),
                mensagens.findFirstByConversaIdOrderByIdDesc(conversa.getId()).map(MensagemResposta::de).orElse(null), 0);
    }

    @Transactional(readOnly = true)
    public List<MensagemResposta> mensagens(UsuarioAutenticado eu, Long conversaId, Long antesDeId) {
        participante(eu, conversaId);
        return mensagens.recentes(conversaId, antesDeId == null ? 0 : antesDeId, PageRequest.of(0, LIMITE_MENSAGENS))
                .stream().map(MensagemResposta::de).toList();
    }

    @Transactional
    public MensagemResposta enviar(UsuarioAutenticado eu, Long conversaId, String texto) {
        String conteudo = texto == null ? "" : texto.strip();
        if (conteudo.isEmpty() || conteudo.length() > Limites.MENSAGEM_TEXTO) {
            throw new RegraNegocioExcecao("A mensagem deve ter entre 1 e %d caracteres.".formatted(Limites.MENSAGEM_TEXTO));
        }
        Conversa conversa = participante(eu, conversaId);
        Long destinatarioId = conversa.outroParticipante(eu.id());
        colegaAtivo(eu, destinatarioId);
        Mensagem mensagem = mensagens.save(new Mensagem(conversaId, eu.id(), conteudo));
        conversa.registrarMensagem(mensagem.getEnviadaEm());
        MensagemResposta resposta = MensagemResposta.de(mensagem);
        // Entrega só depois do commit: ninguém recebe mensagem que não foi gravada.
        Transacoes.aposConfirmar(() -> {
            mensageiro.convertAndSendToUser(String.valueOf(destinatarioId), DESTINO_USUARIO, EventoChat.mensagem(resposta));
            mensageiro.convertAndSendToUser(String.valueOf(eu.id()), DESTINO_USUARIO, EventoChat.mensagem(resposta));
        });
        return resposta;
    }

    @Transactional
    public void marcarLidas(UsuarioAutenticado eu, Long conversaId) {
        Conversa conversa = participante(eu, conversaId);
        if (mensagens.marcarLidas(conversaId, eu.id(), Instant.now()) > 0) {
            Long outro = conversa.outroParticipante(eu.id());
            Transacoes.aposConfirmar(() -> mensageiro.convertAndSendToUser(String.valueOf(outro), DESTINO_USUARIO, EventoChat.lidas(conversaId)));
        }
    }

    /** Insere ignorando conflito: se o outro abriu a mesma conversa no mesmo instante, reaproveita a dele. */
    private Conversa criar(UsuarioAutenticado eu, Long outroUsuarioId) {
        Long a = Math.min(eu.id(), outroUsuarioId);
        Long b = Math.max(eu.id(), outroUsuarioId);
        conversas.inserirSeNaoExistir(eu.unidadeId(), a, b);
        return conversas.findByUsuarioAIdAndUsuarioBId(a, b).orElseThrow();
    }

    private Conversa participante(UsuarioAutenticado eu, Long conversaId) {
        Conversa conversa = conversas.findById(conversaId).orElseThrow(() -> new NaoEncontradoExcecao("Conversa"));
        if (!conversa.participa(eu.id())) {
            throw new NaoEncontradoExcecao("Conversa");
        }
        return conversa;
    }

    private Usuario colegaAtivo(UsuarioAutenticado eu, Long usuarioId) {
        Usuario outro = usuarios.findComCargoEUnidadeById(usuarioId).orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
        if (!outro.isAtivo() || !outro.getUnidade().getId().equals(eu.unidadeId())) {
            throw new AcessoNegadoExcecao("O chat é só entre pessoas ativas da mesma unidade.");
        }
        return outro;
    }

}

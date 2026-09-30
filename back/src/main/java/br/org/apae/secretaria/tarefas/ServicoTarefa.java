package br.org.apae.secretaria.tarefas;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import br.org.apae.secretaria.tarefas.dto.RequisicaoTarefa;
import br.org.apae.secretaria.tarefas.dto.RequisicaoTarefaRapida;
import br.org.apae.secretaria.tarefas.dto.SugestoesTarefa;
import br.org.apae.secretaria.tarefas.dto.TarefaResposta;
import lombok.RequiredArgsConstructor;

/** Tarefas e rotinas da Secretaria (também alimentam Kanban, Agenda, Pendências e Painel). */
@Service
@RequiredArgsConstructor
public class ServicoTarefa {

    public static final String REF = "TAREFA";
    private static final String PREFIXO_CODIGO = "TAR";
    private static final Set<StatusTarefa> ENCERRADAS = Set.of(StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA);
    private static final int LIMITE_ENCERRADAS = 200;

    private final TarefaRepositorio repositorio;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoNumeracao numeracao;
    private final Relogio relogio;

    // ---------- leitura ----------

    /** Abertas + rotinas ativas + concluídas desde a data (padrão: hoje). */
    @Transactional(readOnly = true)
    public List<TarefaResposta> ativas(LocalDate concluidasDesde) {
        LocalDate hoje = relogio.hoje();
        return repositorio.ativas(contexto.unidadeLeitura(), ENCERRADAS, concluidasDesde != null ? concluidasDesde : hoje)
                .stream().map(t -> TarefaResposta.de(t, hoje)).toList();
    }

    @Transactional(readOnly = true)
    public List<TarefaResposta> encerradas(int limite) {
        LocalDate hoje = relogio.hoje();
        int tamanho = Math.clamp(limite, 1, LIMITE_ENCERRADAS);
        return repositorio.encerradas(contexto.unidadeLeitura(), ENCERRADAS, PageRequest.of(0, tamanho))
                .stream().map(t -> TarefaResposta.de(t, hoje)).toList();
    }

    @Transactional(readOnly = true)
    public TarefaResposta detalhe(Long id) {
        return resposta(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDa(Long id) {
        Tarefa tarefa = buscarParaLeitura(id);
        return historico.doRegistro(tarefa.getUnidadeId(), REF, id);
    }

    @Transactional(readOnly = true)
    public SugestoesTarefa sugestoes() {
        Long unidadeId = contexto.unidadeLeitura();
        return new SugestoesTarefa(repositorio.responsaveis(unidadeId), repositorio.categorias(unidadeId));
    }

    // ---------- criação e edição ----------

    @Transactional
    public TarefaResposta criar(RequisicaoTarefa r) {
        Tarefa tarefa = nova(r.titulo());
        aplicar(tarefa, r);
        repositorio.save(tarefa);
        registrar(tarefa, AcaoHistorico.CRIACAO, "Tarefa \"%s\" criada%s.".formatted(tarefa.getTitulo(),
                tarefa.recorrente() ? " (" + tarefa.getFrequencia().rotulo() + ")" : ""));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta criarRapida(RequisicaoTarefaRapida r) {
        Tarefa tarefa = nova(r.titulo());
        tarefa.setPrazo(r.prazo());
        tarefa.setResponsavel(Textos.limpo(r.responsavel()));
        repositorio.save(tarefa);
        if (r.status() != null && r.status() != StatusTarefa.PENDENTE) {
            tarefa.alterarStatus(r.status(), relogio.hoje());
        }
        registrar(tarefa, AcaoHistorico.CRIACAO, "Tarefa \"%s\" criada.".formatted(tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta atualizar(Long id, RequisicaoTarefa r) {
        Tarefa tarefa = buscarParaEscrita(id);
        aplicar(tarefa, r);
        registrar(tarefa, AcaoHistorico.EDICAO, "Tarefa \"%s\" editada.".formatted(tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public void excluir(Long id) {
        Tarefa tarefa = buscarParaEscrita(id);
        repositorio.delete(tarefa);
        registrar(tarefa, AcaoHistorico.EXCLUSAO, "Tarefa \"%s\" excluída.".formatted(tarefa.getTitulo()));
    }

    // ---------- ações rápidas ----------

    @Transactional
    public TarefaResposta concluir(Long id) {
        Tarefa tarefa = buscarParaEscrita(id);
        tarefa.concluir(relogio.hoje());
        registrar(tarefa, AcaoHistorico.CONCLUSAO, tarefa.recorrente()
                ? "Tarefa \"%s\" realizada. Próxima ocorrência: %s.".formatted(tarefa.getTitulo(), Datas.br(tarefa.getProxima()))
                : "Tarefa \"%s\" concluída.".formatted(tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta reabrir(Long id) {
        Tarefa tarefa = buscarParaEscrita(id);
        tarefa.reabrir(relogio.hoje());
        registrar(tarefa, AcaoHistorico.REABERTURA, "Tarefa \"%s\" reaberta.".formatted(tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta alterarStatus(Long id, StatusTarefa status) {
        Tarefa tarefa = buscarParaEscrita(id);
        if (tarefa.getStatus() == status) {
            return resposta(tarefa);
        }
        if (status == StatusTarefa.CONCLUIDA) {
            return concluir(id);
        }
        boolean eraEncerrada = tarefa.getStatus().encerrada();
        tarefa.alterarStatus(status, relogio.hoje());
        String rotulo = tarefa.recorrente()
                ? (status == StatusTarefa.CANCELADA ? "Rotina encerrada" : "Rotina reativada")
                : "Situação alterada para " + status.rotulo();
        registrar(tarefa, eraEncerrada ? AcaoHistorico.REABERTURA : AcaoHistorico.EDICAO,
                "%s: \"%s\".".formatted(rotulo, tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta alterarPrioridade(Long id, Prioridade prioridade) {
        Tarefa tarefa = buscarParaEscrita(id);
        tarefa.setPrioridade(prioridade);
        registrar(tarefa, AcaoHistorico.EDICAO,
                "Prioridade alterada para %s: \"%s\".".formatted(prioridade.rotulo(), tarefa.getTitulo()));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta moverPara(Long id, LocalDate data) {
        Tarefa tarefa = buscarParaEscrita(id);
        tarefa.moverPara(data);
        registrar(tarefa, AcaoHistorico.MOVIMENTACAO,
                "Tarefa \"%s\" movida para %s.".formatted(tarefa.getTitulo(), Datas.br(data)));
        return resposta(tarefa);
    }

    // ---------- checklist ----------

    @Transactional
    public TarefaResposta adicionarSubtarefa(Long id, String texto) {
        Tarefa tarefa = buscarParaEscrita(id);
        String limpo = Textos.limpo(texto);
        tarefa.adicionarSubtarefa(limpo);
        registrar(tarefa, AcaoHistorico.EDICAO, "Subtarefa \"%s\" adicionada.".formatted(limpo));
        return resposta(repositorio.saveAndFlush(tarefa));
    }

    @Transactional
    public TarefaResposta marcarSubtarefa(Long id, Long subtarefaId, boolean feita) {
        Tarefa tarefa = buscarParaEscrita(id);
        tarefa.marcarSubtarefa(subtarefaId, feita);
        registrar(tarefa, AcaoHistorico.EDICAO, "Subtarefa \"%s\" marcada como %s.".formatted(
                tarefa.subtarefa(subtarefaId).getTexto(), feita ? "concluída" : "pendente"));
        return resposta(tarefa);
    }

    @Transactional
    public TarefaResposta removerSubtarefa(Long id, Long subtarefaId) {
        Tarefa tarefa = buscarParaEscrita(id);
        Subtarefa removida = tarefa.removerSubtarefa(subtarefaId);
        registrar(tarefa, AcaoHistorico.EDICAO, "Subtarefa \"%s\" removida.".formatted(removida.getTexto()));
        return resposta(tarefa);
    }

    // ---------- apoio ----------

    private Tarefa nova(String titulo) {
        Long unidadeId = contexto.unidadeEscrita();
        return new Tarefa(unidadeId, numeracao.codigo(PREFIXO_CODIGO, unidadeId), Textos.limpo(titulo), contexto.usuario().id());
    }

    private static void aplicar(Tarefa tarefa, RequisicaoTarefa r) {
        tarefa.setTitulo(Textos.limpo(r.titulo()));
        tarefa.setPrioridade(r.prioridade());
        tarefa.setHorario(r.horario());
        tarefa.setResponsavel(Textos.limpo(r.responsavel()));
        tarefa.setCategoria(Textos.limpo(r.categoria()));
        tarefa.setDescricao(Textos.limpo(r.descricao()));
        tarefa.definirRotina(r.frequencia(), r.diaSemana(), r.diaMes(), r.prazo());
    }

    private Tarefa buscarParaLeitura(Long id) {
        Tarefa tarefa = repositorio.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Tarefa"));
        contexto.exigirLeitura(tarefa.getUnidadeId());
        return tarefa;
    }

    private Tarefa buscarParaEscrita(Long id) {
        Tarefa tarefa = repositorio.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Tarefa"));
        contexto.exigirEscrita(tarefa.getUnidadeId());
        return tarefa;
    }

    private void registrar(Tarefa tarefa, AcaoHistorico acao, String descricao) {
        historico.registrar(ModuloHistorico.SECRETARIA, acao, descricao, REF, tarefa.getId());
    }

    private TarefaResposta resposta(Tarefa tarefa) {
        return TarefaResposta.de(tarefa, relogio.hoje());
    }
}

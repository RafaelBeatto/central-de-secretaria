package br.org.apae.secretaria.agenda;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.agenda.Evento.DadosEvento;
import br.org.apae.secretaria.agenda.dto.EventoDetalhe;
import br.org.apae.secretaria.agenda.dto.RequisicaoEvento;
import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.dominio.Recorrencia;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.tarefas.Tarefa;
import br.org.apae.secretaria.tarefas.TarefaRepositorio;
import lombok.RequiredArgsConstructor;

/** Eventos da agenda e suas séries (regras de old/js/05-agenda.js). */
@Service
@RequiredArgsConstructor
public class ServicoEvento {

    public static final String REF = "EVENTO";
    /** Como no antigo: uma série para de gerar datas em silêncio depois de 370. */
    private static final int LIMITE_DATAS = 370;
    private static final String TAREFA_LER = "TAREFA_LER";

    private final EventoRepositorio eventos;
    private final EventoSerieRepositorio series;
    private final TarefaRepositorio tarefas;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;

    // ---------- leitura ----------

    @Transactional(readOnly = true)
    public EventoDetalhe detalhe(Long id) {
        return detalhe(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Evento evento = buscarParaLeitura(id);
        return historico.doRegistro(evento.getUnidadeId(), REF, id);
    }

    // ---------- criação e edição ----------

    @Transactional
    public EventoDetalhe criar(RequisicaoEvento r) {
        Long unidadeId = contexto.unidadeEscrita();
        Evento primeiro = new Evento(unidadeId, contexto.usuario().id(), r.data());
        primeiro.aplicar(dados(r, unidadeId, null));
        if (r.frequencia() == null) {
            eventos.save(primeiro);
            registrar(primeiro, AcaoHistorico.CRIACAO, "Evento \"%s\" criado.".formatted(primeiro.getTitulo()));
            return detalhe(primeiro);
        }
        int total = repetir(primeiro, r);
        registrar(primeiro, AcaoHistorico.CRIACAO,
                "Evento \"%s\" criado (%d datas).".formatted(primeiro.getTitulo(), total));
        return detalhe(primeiro);
    }

    /**
     * Fora de série: aplica os dados e a data, e pode ligar a repetição a partir dela.
     * Em série: SO_ESTA mexe só nesta data; ESTA_E_PROXIMAS aplica os dados a esta e às
     * seguintes e desloca cada uma pelo mesmo número de dias que esta data mudou.
     */
    @Transactional
    public EventoDetalhe atualizar(Long id, RequisicaoEvento r) {
        Evento evento = buscarParaEscrita(id);
        List<Evento> serie = serieDe(evento);
        if (evento.emSerie() && serie.size() <= 1) {
            // Sobrou só esta data: deixa de ser série (e pode voltar a repetir).
            EventoSerie vazia = evento.getSerie();
            evento.sairDaSerie();
            series.delete(vazia);
            serie = List.of();
        }
        DadosEvento dados = dados(r, evento.getUnidadeId(), evento.getTarefa());

        if (!serie.isEmpty() && r.escopo() == EscopoSerie.ESTA_E_PROXIMAS) {
            long deslocamento = ChronoUnit.DAYS.between(evento.getData(), r.data());
            LocalDate aPartirDe = evento.getData();
            List<Evento> proximos = serie.stream().filter(x -> !x.getData().isBefore(aPartirDe)).toList();
            proximos.forEach(x -> {
                x.aplicar(dados);
                x.moverPara(x.getData().plusDays(deslocamento));
            });
            registrar(evento, AcaoHistorico.EDICAO,
                    "Evento \"%s\" editado em %d datas.".formatted(evento.getTitulo(), proximos.size()));
            return detalhe(evento);
        }

        evento.aplicar(dados);
        evento.moverPara(r.data());
        int extras = 0;
        if (serie.isEmpty() && r.frequencia() != null) {
            extras = repetir(evento, r) - 1;
        }
        registrar(evento, AcaoHistorico.EDICAO, extras > 0
                ? "Evento \"%s\" editado e repetido em mais %d datas.".formatted(evento.getTitulo(), extras)
                : "Evento \"%s\" editado.".formatted(evento.getTitulo()));
        return detalhe(evento);
    }

    /** Exclui esta data, esta e as próximas ou todas as datas da série. Devolve quantas saíram. */
    @Transactional
    public int excluir(Long id, EscopoSerie escopo) {
        Evento evento = buscarParaEscrita(id);
        List<Evento> serie = serieDe(evento);
        List<Evento> alvo = switch (escopo == null || serie.isEmpty() ? EscopoSerie.SO_ESTA : escopo) {
            case SO_ESTA -> List.of(evento);
            case ESTA_E_PROXIMAS -> serie.stream().filter(x -> !x.getData().isBefore(evento.getData())).toList();
            case TODAS -> serie;
        };
        EventoSerie daSerie = evento.getSerie();
        eventos.deleteAll(alvo);
        if (daSerie != null && alvo.size() >= serie.size()) {
            series.delete(daSerie);
        }
        registrar(evento, AcaoHistorico.EXCLUSAO, alvo.size() > 1
                ? "%d datas do evento \"%s\" excluídas.".formatted(alvo.size(), evento.getTitulo())
                : "Evento \"%s\" (%s) excluído.".formatted(evento.getTitulo(), Datas.br(evento.getData())));
        return alvo.size();
    }

    // ---------- ações rápidas ----------

    @Transactional
    public EventoDetalhe concluir(Long id) {
        Evento evento = buscarParaEscrita(id);
        if (evento.isConcluido()) {
            throw new RegraNegocioExcecao("Este evento já está concluído.");
        }
        evento.concluir();
        registrar(evento, AcaoHistorico.CONCLUSAO, "Evento \"%s\" concluído.".formatted(evento.getTitulo()));
        return detalhe(evento);
    }

    @Transactional
    public EventoDetalhe reabrir(Long id) {
        Evento evento = buscarParaEscrita(id);
        if (!evento.isConcluido()) {
            throw new RegraNegocioExcecao("Este evento não está concluído.");
        }
        evento.reabrir();
        registrar(evento, AcaoHistorico.REABERTURA, "Evento \"%s\" reaberto.".formatted(evento.getTitulo()));
        return detalhe(evento);
    }

    /** Arrastar na agenda: muda só esta data (numa série, as outras ficam onde estão). */
    @Transactional
    public EventoDetalhe moverPara(Long id, LocalDate data) {
        Evento evento = buscarParaEscrita(id);
        if (!evento.getData().equals(data)) {
            evento.moverPara(data);
            registrar(evento, AcaoHistorico.MOVIMENTACAO,
                    "Evento \"%s\" movido para %s.".formatted(evento.getTitulo(), Datas.br(data)));
        }
        return detalhe(evento);
    }

    // ---------- apoio ----------

    /** Cria a série a partir do evento (que vira a 1ª data) e grava as outras datas. Devolve o total. */
    private int repetir(Evento primeiro, RequisicaoEvento r) {
        LocalDate ate = r.repetirAte() != null ? r.repetirAte() : fimPadraoDaRepeticao(primeiro.getData());
        List<LocalDate> datas = Recorrencia.datasDaSerie(primeiro.getData(), ate, r.frequencia(), LIMITE_DATAS);
        primeiro.entrarNaSerie(series.save(new EventoSerie(primeiro.getUnidadeId(), r.frequencia(), ate)));
        eventos.save(primeiro);
        eventos.saveAll(datas.stream().skip(1).map(primeiro::copiarPara).toList());
        return datas.size();
    }

    /** Padrão do antigo: 31/12 do ano, ou um ano depois se faltarem 30 dias ou menos para o fim do ano. */
    public static LocalDate fimPadraoDaRepeticao(LocalDate data) {
        LocalDate fimDoAno = LocalDate.of(data.getYear(), 12, 31);
        return ChronoUnit.DAYS.between(data, fimDoAno) > 30 ? fimDoAno : data.plusDays(365);
    }

    private List<Evento> serieDe(Evento evento) {
        return evento.emSerie() ? eventos.daSerie(evento.getSerie().getId()) : List.of();
    }

    /** Limpa os textos e confere a tarefa ligada (mantida se não mudou). */
    private DadosEvento dados(RequisicaoEvento r, Long unidadeId, Tarefa tarefaAtual) {
        return new DadosEvento(Textos.limpo(r.titulo()), r.tipo(), r.prioridade(), r.horarioInicio(), r.horarioFim(),
                Textos.limpo(r.local()), Textos.limpo(r.responsavel()), Textos.limpo(r.participantes()),
                Textos.limpo(r.descricao()), tarefaLigada(r.tarefaId(), unidadeId, tarefaAtual));
    }

    private Tarefa tarefaLigada(Long tarefaId, Long unidadeId, Tarefa atual) {
        if (tarefaId == null) {
            return null;
        }
        if (atual != null && atual.getId().equals(tarefaId)) {
            return atual;
        }
        if (!contexto.usuario().possui(TAREFA_LER)) {
            throw new AcessoNegadoExcecao("Você não tem acesso às tarefas da Secretaria.");
        }
        Tarefa tarefa = tarefas.findById(tarefaId)
                .filter(t -> t.getUnidadeId().equals(unidadeId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Tarefa"));
        if (tarefa.getStatus().encerrada()) {
            throw new RegraNegocioExcecao("Escolha uma tarefa que ainda está em aberto.");
        }
        return tarefa;
    }

    private EventoDetalhe detalhe(Evento evento) {
        return EventoDetalhe.de(evento, serieDe(evento));
    }

    private Evento buscarParaLeitura(Long id) {
        Evento evento = eventos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Evento"));
        contexto.exigirLeitura(evento.getUnidadeId());
        return evento;
    }

    private Evento buscarParaEscrita(Long id) {
        Evento evento = eventos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Evento"));
        contexto.exigirEscrita(evento.getUnidadeId());
        return evento;
    }

    private void registrar(Evento evento, AcaoHistorico acao, String descricao) {
        historico.registrar(ModuloHistorico.AGENDA, acao, descricao, REF, evento.getId());
    }
}

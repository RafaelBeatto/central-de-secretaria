package br.org.apae.secretaria.relatorios;

import java.math.BigDecimal;
import java.text.Collator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.agenda.Evento;
import br.org.apae.secretaria.agenda.EventoRepositorio;
import br.org.apae.secretaria.atendimentos.Atendimento;
import br.org.apae.secretaria.atendimentos.AtendimentoRepositorio;
import br.org.apae.secretaria.atendimentos.Presenca;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.documentos.Documento;
import br.org.apae.secretaria.documentos.DocumentoRepositorio;
import br.org.apae.secretaria.documentos.DocumentoVersaoRepositorio;
import br.org.apae.secretaria.projetos.CalculoProjetos;
import br.org.apae.secretaria.projetos.Execucao;
import br.org.apae.secretaria.projetos.ExecucaoRepositorio;
import br.org.apae.secretaria.projetos.PagamentoRepositorio;
import br.org.apae.secretaria.projetos.Recurso;
import br.org.apae.secretaria.projetos.RecursoRepositorio;
import br.org.apae.secretaria.projetos.dto.RespostasProjeto.FinanceiroRecurso;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Agenda;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Atendimentos;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Compromisso;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Documentos;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Motivo;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Pagamento;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.PorProfissional;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Projetos;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.RecursoFinanceiro;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Renovado;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Secretaria;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.Situacao;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.TarefaAtrasada;
import br.org.apae.secretaria.relatorios.dto.RelatorioAtividades.TarefaConcluida;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.HistoricoRepositorio;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.tarefas.StatusTarefa;
import br.org.apae.secretaria.tarefas.Tarefa;
import br.org.apae.secretaria.tarefas.TarefaRepositorio;
import lombok.RequiredArgsConstructor;

/** Relatório de atividades (old/js/09-relatorios.js): o que foi feito no período em cada área. */
@Service
@RequiredArgsConstructor
public class ServicoRelatorio {

    private static final int MAXIMO_DIAS = 366;
    private static final Collator COLLATOR = Collator.getInstance(Locale.of("pt", "BR"));

    private final TarefaRepositorio tarefas;
    private final EventoRepositorio eventos;
    private final AtendimentoRepositorio atendimentos;
    private final DocumentoRepositorio documentos;
    private final DocumentoVersaoRepositorio versoes;
    private final HistoricoRepositorio historico;
    private final RecursoRepositorio recursos;
    private final ExecucaoRepositorio execucoes;
    private final PagamentoRepositorio pagamentos;
    private final CalculoProjetos calculo;
    private final ContextoSeguranca contexto;
    private final Relogio relogio;

    @Transactional(readOnly = true)
    public RelatorioAtividades atividades(LocalDate de, LocalDate ate, Set<String> pedidas) {
        if (ate.isBefore(de)) {
            throw new RegraNegocioExcecao("A data inicial é depois da data final.");
        }
        if (ChronoUnit.DAYS.between(de, ate) > MAXIMO_DIAS) {
            throw new RegraNegocioExcecao("Escolha um período de até 1 ano.");
        }
        Long unidadeId = contexto.unidadeLeitura();
        UsuarioAutenticado usuario = contexto.usuario();
        ZoneId fuso = relogio.fuso();
        Instant inicio = de.atStartOfDay(fuso).toInstant();
        Instant fim = ate.plusDays(1).atStartOfDay(fuso).toInstant();
        return new RelatorioAtividades(de, ate,
                quer("secretaria", pedidas) && usuario.possui("TAREFA_LER") ? secretaria(unidadeId, de, ate, inicio, fim, fuso) : null,
                quer("agenda", pedidas) && usuario.possui("AGENDA_LER") ? agenda(unidadeId, de, ate) : null,
                quer("atendimentos", pedidas) && usuario.possui("ATENDIMENTO_LER") ? atendimentos(unidadeId, de, ate) : null,
                quer("documentos", pedidas) && usuario.possui("DOCUMENTO_LER") ? documentos(unidadeId, inicio, fim, fuso) : null,
                quer("projetos", pedidas) && usuario.possui("PROJETO_LER") ? projetos(unidadeId, de, ate) : null);
    }

    private static boolean quer(String secao, Set<String> pedidas) {
        return pedidas.isEmpty() || pedidas.contains(secao);
    }

    private Secretaria secretaria(Long unidadeId, LocalDate de, LocalDate ate, Instant inicio, Instant fim, ZoneId fuso) {
        LocalDate hoje = relogio.hoje();
        List<Tarefa> todas = tarefas.ativas(unidadeId, List.of(StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA), de);
        List<TarefaConcluida> concluidas = new ArrayList<>();
        todas.stream().filter(t -> !t.recorrente() && t.getStatus() == StatusTarefa.CONCLUIDA && t.getDataConclusao() != null
                && !t.getDataConclusao().isBefore(de) && !t.getDataConclusao().isAfter(ate))
                .forEach(t -> concluidas.add(new TarefaConcluida(t.getDataConclusao(), t.getTitulo(), t.getResponsavel())));
        // Rotina: cada vez que foi feita fica registrada no histórico.
        Map<Long, Tarefa> rotinas = todas.stream().filter(Tarefa::recorrente).collect(Collectors.toMap(Tarefa::getId, t -> t));
        historico.acoesSobre(unidadeId, ModuloHistorico.SECRETARIA, AcaoHistorico.CONCLUSAO, "TAREFA", inicio, fim).stream()
                .filter(l -> rotinas.containsKey((Long) l[0])).forEach(l -> {
                    Tarefa t = rotinas.get((Long) l[0]);
                    concluidas.add(new TarefaConcluida(((Instant) l[1]).atZone(fuso).toLocalDate(),
                            "%s (%s)".formatted(t.getTitulo(), t.getFrequencia().name().toLowerCase(Locale.ROOT)), t.getResponsavel()));
                });
        concluidas.sort(Comparator.comparing(TarefaConcluida::dia));
        int criadas = (int) todas.stream().filter(t -> {
            LocalDate dia = t.getCriadoEm().atZone(fuso).toLocalDate();
            return !dia.isBefore(de) && !dia.isAfter(ate);
        }).count();
        List<Tarefa> abertas = todas.stream().filter(t -> !t.getStatus().encerrada()).toList();
        List<TarefaAtrasada> atrasadas = abertas.stream()
                .filter(t -> t.prazoEfetivo() != null && t.prazoEfetivo().isBefore(hoje))
                .sorted(Comparator.comparing(Tarefa::prazoEfetivo))
                .map(t -> new TarefaAtrasada(t.prazoEfetivo(), t.getTitulo(), t.getResponsavel())).toList();
        return new Secretaria(criadas, abertas.size(), concluidas, atrasadas);
    }

    private Agenda agenda(Long unidadeId, LocalDate de, LocalDate ate) {
        List<Evento> lista = eventos.doPeriodo(unidadeId, de, ate).stream()
                .sorted(Comparator.comparing(Evento::getData)
                        .thenComparing(Evento::getHorarioInicio, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
        return new Agenda((int) lista.stream().filter(Evento::isConcluido).count(), lista.stream()
                .map(e -> new Compromisso(e.getData(), e.getHorarioInicio(), e.getTitulo(), e.getTipo().name(), e.getLocal(),
                        e.isConcluido()))
                .toList());
    }

    private Atendimentos atendimentos(Long unidadeId, LocalDate de, LocalDate ate) {
        List<Atendimento> lista = this.atendimentos.porPeriodo(unidadeId, de, ate).stream().filter(Atendimento::efetivo).toList();
        int veio = contar(lista, Presenca.VEIO);
        int faltou = contar(lista, Presenca.FALTOU);
        Map<String, List<Atendimento>> porProfissional = lista.stream()
                .collect(Collectors.groupingBy(a -> a.getProfissional().getNome(), LinkedHashMap::new, Collectors.toList()));
        List<PorProfissional> profissionais = porProfissional.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(COLLATOR))
                .map(e -> new PorProfissional(e.getKey(), alunos(e.getValue()), e.getValue().size(),
                        contar(e.getValue(), Presenca.VEIO), contar(e.getValue(), Presenca.FALTOU)))
                .toList();
        Map<String, Integer> motivos = new LinkedHashMap<>();
        lista.stream().filter(a -> a.getPresenca() == Presenca.FALTOU).forEach(a -> motivos
                .merge(a.getFaltaMotivo() == null ? "Sem motivo" : a.getFaltaMotivo().rotulo(), 1, Integer::sum));
        List<Motivo> motivosOrdenados = motivos.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> new Motivo(e.getKey(), e.getValue())).toList();
        Integer taxa = veio + faltou == 0 ? null : (int) Math.round(veio * 100.0 / (veio + faltou));
        return new Atendimentos(lista.size(), alunos(lista), veio, faltou, contar(lista, Presenca.NAO_INFORMADO), taxa,
                profissionais, motivosOrdenados);
    }

    private static int contar(List<Atendimento> lista, Presenca presenca) {
        return (int) lista.stream().filter(a -> a.getPresenca() == presenca).count();
    }

    private static int alunos(List<Atendimento> lista) {
        return (int) lista.stream().map(a -> a.getAluno().getId()).distinct().count();
    }

    private Documentos documentos(Long unidadeId, Instant inicio, Instant fim, ZoneId fuso) {
        LocalDate hoje = relogio.hoje();
        List<Documento> todos = this.documentos.findByUnidadeIdOrderByNomeAsc(unidadeId);
        List<Renovado> renovados = versoes.renovacoes(unidadeId, inicio, fim).stream()
                .map(l -> new Renovado(((Instant) l[1]).atZone(fuso).toLocalDate(), (String) l[0], (LocalDate) l[2])).toList();
        int cadastrados = (int) todos.stream()
                .filter(d -> !d.getCriadoEm().isBefore(inicio) && d.getCriadoEm().isBefore(fim)).count();
        List<Situacao> situacao = todos.stream()
                .filter(d -> d.getDataValidade() != null && ChronoUnit.DAYS.between(hoje, d.getDataValidade()) <= 30)
                .sorted(Comparator.comparing(Documento::getDataValidade))
                .map(d -> new Situacao(d.getNome(), d.getDataValidade(), ChronoUnit.DAYS.between(hoje, d.getDataValidade())))
                .toList();
        return new Documentos(todos.size(), cadastrados, renovados, situacao);
    }

    private Projetos projetos(Long unidadeId, LocalDate de, LocalDate ate) {
        List<Recurso> ativos = recursos.findByUnidadeIdOrderByDataInicioDescIdDesc(unidadeId).stream()
                .filter(r -> !r.isArquivado()).toList();
        List<Execucao> todasExecucoes = ativos.isEmpty() ? List.of()
                : execucoes.findByRecursoIdIn(ativos.stream().map(Recurso::getId).toList());
        Map<Long, BigDecimal> pagos = calculo.pagos(todasExecucoes);
        List<RecursoFinanceiro> financeiro = ativos.stream().map(r -> {
            List<Execucao> doRecurso = todasExecucoes.stream().filter(e -> e.getRecursoId().equals(r.getId())).toList();
            FinanceiroRecurso f = calculo.financeiro(r, doRecurso, pagos);
            return new RecursoFinanceiro(r.getNome(), f.recebido(), f.pago(), f.disponivel());
        }).toList();
        List<Pagamento> doPeriodo = pagamentos.doPeriodo(unidadeId, de, ate).stream()
                .map(l -> new Pagamento((LocalDate) l[0], (String) l[1], (String) l[2], (String) l[3], (BigDecimal) l[4]))
                .toList();
        BigDecimal total = doPeriodo.stream().map(Pagamento::valor).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Projetos(financeiro, doPeriodo, total);
    }
}

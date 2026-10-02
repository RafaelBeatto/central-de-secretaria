package br.org.apae.secretaria.atendimentos;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.atendimentos.dto.AtendimentoResposta;
import br.org.apae.secretaria.atendimentos.dto.RequisicaoAtendimentoLote;
import br.org.apae.secretaria.atendimentos.dto.RequisicaoNovoAtendimento;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.NovaPresenca;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.Remarcar;
import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.painel.dto.ExtrasPainel;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Recorrencia;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Atendimentos e suas séries semanais (regras de old/js/19-atendimentos.js).
 * Professor e profissional (cargo ligado a um profissional) só enxergam e criam
 * os próprios atendimentos; os demais cargos veem todos os da unidade.
 */
@Service
@RequiredArgsConstructor
public class ServicoAtendimento {

    static final String REF = "ATENDIMENTO";
    /** Como no antigo: no máximo 52 semanas por série. */
    private static final int LIMITE_SERIE = 52;
    private static final int LIMITE_PAINEL = 300;
    private static final int FALTAS_PARA_ALERTA = 3;
    /** Só olha o último trimestre: uma sequência de faltas mais antiga já não pede busca ativa. */
    private static final int JANELA_FALTAS_DIAS = 90;

    private final AtendimentoRepositorio atendimentos;
    private final AlunoRepositorio alunos;
    private final ProfissionalRepositorio profissionais;
    private final ServicoCadastroAtendimento cadastro;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final Relogio relogio;

    // ---------- leitura ----------

    @Transactional(readOnly = true)
    public List<AtendimentoResposta> itens(LocalDate inicio, LocalDate fim) {
        Long unidadeId = contexto.unidadeLeitura();
        Long meuProfissionalId = meuProfissionalIdOuNull(unidadeId);
        List<Atendimento> lista = meuProfissionalId != null
                ? atendimentos.porPeriodoDoProfissional(unidadeId, meuProfissionalId, inicio, fim)
                : atendimentos.porPeriodo(unidadeId, inicio, fim);
        return lista.stream().map(this::resposta).toList();
    }

    /** Atendimentos que já aconteceram e ainda esperam a presença (no escopo do usuário). */
    @Transactional(readOnly = true)
    public List<ExtrasPainel.AtendimentoSemPresenca> semPresenca() {
        Long unidadeId = contexto.unidadeLeitura();
        return doEscopo(unidadeId, atendimentos.semPresenca(unidadeId, relogio.hoje(), Presenca.NAO_INFORMADO)).stream()
                .limit(LIMITE_PAINEL)
                .map(a -> new ExtrasPainel.AtendimentoSemPresenca(a.getId(), a.getAluno().getNome(),
                        a.getProfissional().getNome(), a.getData(), a.getHorario()))
                .toList();
    }

    /**
     * Alunos com {@value #FALTAS_PARA_ALERTA} faltas seguidas ou mais ainda não tratadas com a família
     * (mesma regra do front: conta do mais recente para trás e para na primeira presença).
     */
    @Transactional(readOnly = true)
    public List<ExtrasPainel.AlunoComFaltas> alunosComFaltasSeguidas() {
        Long unidadeId = contexto.unidadeLeitura();
        LocalDate hoje = relogio.hoje();
        Map<Aluno, List<Atendimento>> porAluno = doEscopo(unidadeId,
                atendimentos.decididosDesde(unidadeId, hoje.minusDays(JANELA_FALTAS_DIAS), hoje, Presenca.NAO_INFORMADO))
                .stream().collect(Collectors.groupingBy(Atendimento::getAluno, LinkedHashMap::new, Collectors.toList()));
        List<ExtrasPainel.AlunoComFaltas> resultado = new ArrayList<>();
        porAluno.forEach((aluno, lista) -> {
            List<Atendimento> faltas = new ArrayList<>();
            for (Atendimento a : lista) {
                if (a.getPresenca() != Presenca.FALTOU) {
                    break;
                }
                faltas.add(a);
            }
            if (faltas.size() < FALTAS_PARA_ALERTA) {
                return;
            }
            LocalDate ultima = faltas.get(0).getData();
            LocalDate tratadaAte = aluno.getFaltasContatoAte();
            if (tratadaAte != null && !ultima.isAfter(tratadaAte)) {
                return;
            }
            List<MotivoFalta> motivos = faltas.stream().map(Atendimento::getFaltaMotivo).filter(Objects::nonNull)
                    .distinct().toList();
            resultado.add(new ExtrasPainel.AlunoComFaltas(aluno.getId(), aluno.getNome(), faltas.size(),
                    faltas.get(faltas.size() - 1).getData(), ultima, motivos));
        });
        return resultado;
    }

    /** Professor/profissional só enxergam os próprios atendimentos. */
    private List<Atendimento> doEscopo(Long unidadeId, List<Atendimento> lista) {
        Long meuProfissionalId = meuProfissionalIdOuNull(unidadeId);
        return meuProfissionalId == null ? lista
                : lista.stream().filter(a -> a.getProfissional().getId().equals(meuProfissionalId)).toList();
    }

    @Transactional(readOnly = true)
    public AtendimentoResposta detalhe(Long id) {
        return resposta(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Atendimento a = buscarParaLeitura(id);
        return historico.doRegistro(a.getUnidadeId(), REF, id);
    }

    @Transactional(readOnly = true)
    public List<AtendimentoResposta> historicoDoAluno(Long alunoId) {
        Aluno aluno = alunos.findById(alunoId).orElseThrow(() -> new NaoEncontradoExcecao("Aluno"));
        contexto.exigirLeitura(aluno.getUnidadeId());
        Long meuProfissionalId = meuProfissionalIdOuNull(aluno.getUnidadeId());
        List<Atendimento> lista = meuProfissionalId != null
                ? atendimentos.porAlunoEProfissional(alunoId, meuProfissionalId)
                : atendimentos.porAluno(alunoId);
        return lista.stream().map(this::resposta).toList();
    }

    @Transactional(readOnly = true)
    public List<AtendimentoResposta> historicoDoProfissional(Long profissionalId) {
        Profissional profissional = profissionais.findById(profissionalId)
                .orElseThrow(() -> new NaoEncontradoExcecao("Profissional"));
        contexto.exigirLeitura(profissional.getUnidadeId());
        Long meuProfissionalId = meuProfissionalIdOuNull(profissional.getUnidadeId());
        if (meuProfissionalId != null && !meuProfissionalId.equals(profissionalId)) {
            throw new NaoEncontradoExcecao("Profissional");
        }
        return atendimentos.porProfissional(profissionalId).stream().map(this::resposta).toList();
    }

    // ---------- criação ----------

    @Transactional
    public AtendimentoResposta criar(RequisicaoNovoAtendimento r) {
        Long unidadeId = contexto.unidadeEscrita();
        Aluno aluno = cadastro.garantirAluno(r.alunoNome(), unidadeId);
        Profissional profissional = profissionalParaEscrita(unidadeId, r.profissionalNome());
        String observacao = Textos.limpo(r.observacao());

        if (!r.semanal()) {
            Atendimento a = new Atendimento(unidadeId, aluno, profissional, r.data(), r.horario(), observacao, null,
                    contexto.usuario().id());
            atendimentos.save(a);
            registrar(a, AcaoHistorico.CRIACAO, "Atendimento de \"%s\" com \"%s\" criado para %s %s."
                    .formatted(aluno.getNome(), profissional.getNome(), Datas.br(r.data()), r.horario()));
            return resposta(a);
        }

        LocalDate ate = r.repetirAte() != null ? r.repetirAte() : fimDoAno(r.data());
        List<LocalDate> datas = Recorrencia.datasDaSerie(r.data(), ate, Frequencia.SEMANAL, LIMITE_SERIE);
        UUID serieId = UUID.randomUUID();
        List<Atendimento> criados = datas.stream()
                .map(d -> new Atendimento(unidadeId, aluno, profissional, d, r.horario(), observacao, serieId,
                        contexto.usuario().id()))
                .toList();
        atendimentos.saveAll(criados);
        Atendimento primeiro = criados.get(0);
        registrar(primeiro, AcaoHistorico.CRIACAO, "Atendimento semanal de \"%s\" com \"%s\" criado (%d semanas, %s)."
                .formatted(aluno.getNome(), profissional.getNome(), datas.size(), r.horario()));
        return resposta(primeiro);
    }

    /** Várias linhas de uma vez; linhas incompletas são ignoradas, como no antigo. */
    @Transactional
    public int criarLote(RequisicaoAtendimentoLote r) {
        Long unidadeId = contexto.unidadeEscrita();
        boolean vinculado = cadastro.vinculado();
        int total = 0;
        for (RequisicaoAtendimentoLote.Linha linha : r.linhas()) {
            String alunoNome = Textos.limpo(linha.alunoNome());
            String profissionalNome = Textos.limpo(linha.profissionalNome());
            if (alunoNome == null || linha.data() == null || linha.horario() == null
                    || (!vinculado && profissionalNome == null)) {
                continue;
            }
            Aluno aluno = cadastro.garantirAluno(alunoNome, unidadeId);
            Profissional profissional = vinculado ? cadastro.meuProfissional(unidadeId)
                    : cadastro.garantirProfissional(profissionalNome, unidadeId);
            if (r.semanal()) {
                List<LocalDate> datas = Recorrencia.datasDaSerie(linha.data(), fimDoAno(linha.data()),
                        Frequencia.SEMANAL, LIMITE_SERIE);
                UUID serieId = UUID.randomUUID();
                atendimentos.saveAll(datas.stream()
                        .map(d -> new Atendimento(unidadeId, aluno, profissional, d, linha.horario(), null, serieId,
                                contexto.usuario().id()))
                        .toList());
                total += datas.size();
            } else {
                atendimentos.save(new Atendimento(unidadeId, aluno, profissional, linha.data(), linha.horario(), null,
                        null, contexto.usuario().id()));
                total++;
            }
        }
        if (total == 0) {
            throw new RegraNegocioExcecao("Preencha ao menos uma linha completa (aluno, profissional e horário).");
        }
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.CRIACAO,
                "%d atendimento(s) adicionados de uma vez%s.".formatted(total, r.semanal() ? " (toda semana)" : ""),
                REF, null);
        return total;
    }

    /** Copia a programação da semana anterior (mesmo aluno/profissional/dia/horário) sem duplicar. */
    @Transactional
    public int copiarSemanaAnterior(LocalDate segundaAtual) {
        Long unidadeId = contexto.unidadeEscrita();
        LocalDate segundaAnterior = segundaAtual.minusDays(7);
        Long meuProfissionalId = meuProfissionalIdOuNull(unidadeId);

        List<Atendimento> atual = buscarSemana(unidadeId, meuProfissionalId, segundaAtual);
        List<Atendimento> anteriorTodos = buscarSemana(unidadeId, meuProfissionalId, segundaAnterior);
        List<Atendimento> anterior = anteriorTodos.stream()
                .filter(a -> a.efetivo() && a.getRemarcadoDe() == null)
                .toList();
        if (anteriorTodos.isEmpty()) {
            throw new RegraNegocioExcecao("Não há atendimentos na semana anterior.");
        }

        Set<String> existentes = atual.stream()
                .map(a -> chave(a, ChronoUnit.DAYS.between(segundaAtual, a.getData())))
                .collect(Collectors.toSet());
        List<Atendimento> copiar = anterior.stream()
                .filter(a -> !existentes.contains(chave(a, ChronoUnit.DAYS.between(segundaAnterior, a.getData()))))
                .toList();
        if (copiar.isEmpty()) {
            throw new RegraNegocioExcecao("Esta semana já tem tudo o que havia na semana anterior.");
        }

        List<Atendimento> criados = copiar.stream()
                .map(a -> new Atendimento(unidadeId, a.getAluno(), a.getProfissional(),
                        segundaAtual.plusDays(ChronoUnit.DAYS.between(segundaAnterior, a.getData())), a.getHorario(),
                        a.getObservacao(), null, contexto.usuario().id()))
                .toList();
        atendimentos.saveAll(criados);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.CRIACAO,
                "%d atendimento(s) copiados da semana anterior.".formatted(criados.size()), REF, null);
        return criados.size();
    }

    // ---------- ações ----------

    @Transactional
    public AtendimentoResposta atualizarPresenca(Long id, NovaPresenca r) {
        Atendimento a = buscarParaEscrita(id);
        if (r.presenca() == Presenca.VEIO && a.getData().isAfter(relogio.hoje())) {
            throw new RegraNegocioExcecao("Ainda não chegou o dia deste atendimento.");
        }
        a.marcarPresenca(r.presenca(), r.faltaMotivo(), Textos.limpo(r.faltaObservacao()));
        String rotulo = switch (r.presenca()) {
            case VEIO -> "Veio";
            case FALTOU -> "Faltou";
            case NAO_INFORMADO -> "Não informado";
        };
        registrar(a, AcaoHistorico.PRESENCA, "Presença de \"%s\" (%s %s) marcada como %s."
                .formatted(a.getAluno().getNome(), Datas.br(a.getData()), a.getHorario(), rotulo));
        return resposta(a);
    }

    @Transactional
    public AtendimentoResposta remarcar(Long id, Remarcar r) {
        Atendimento original = buscarParaEscrita(id);
        if (original.isRemarcado()) {
            throw new RegraNegocioExcecao("Este atendimento já foi remarcado.");
        }
        Profissional novoProfissional = cadastro.vinculado() ? cadastro.meuProfissional(original.getUnidadeId())
                : profissionalEscolhido(r.profissionalId(), original.getUnidadeId(), original.getProfissional());
        if (r.data().equals(original.getData()) && r.horario().equals(original.getHorario())
                && novoProfissional.equals(original.getProfissional())) {
            throw new RegraNegocioExcecao("Escolha outro dia, horário ou profissional.");
        }
        LocalDate dataAnterior = original.getData();
        LocalTime horarioAnterior = original.getHorario();
        Atendimento copia = original.remarcarPara(novoProfissional, r.data(), r.horario(), Textos.limpo(r.motivo()));
        atendimentos.save(copia);
        registrar(original, AcaoHistorico.EDICAO, "Atendimento de \"%s\" remarcado de %s %s para %s %s."
                .formatted(original.getAluno().getNome(), Datas.br(dataAnterior), horarioAnterior,
                        Datas.br(r.data()), r.horario()));
        return resposta(copia);
    }

    @Transactional
    public void excluir(Long id) {
        Atendimento a = buscarParaEscrita(id);
        if (a.getRemarcadoDe() != null) {
            a.getRemarcadoDe().desfazerRemarcacao();
        }
        atendimentos.findByRemarcadoDeId(a.getId()).ifPresent(Atendimento::desligarDoOriginal);
        String descricao = "Atendimento de \"%s\" (%s %s) excluído."
                .formatted(a.getAluno().getNome(), Datas.br(a.getData()), a.getHorario());
        Long id2 = a.getId();
        atendimentos.delete(a);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EXCLUSAO, descricao, REF, id2);
    }

    /** Remove as datas futuras ainda sem presença registrada; as passadas ficam no histórico. */
    @Transactional
    public int encerrarSerie(Long id) {
        Atendimento a = buscarParaEscrita(id);
        if (!a.emSerie()) {
            throw new RegraNegocioExcecao("Este atendimento não faz parte de uma série semanal.");
        }
        List<Atendimento> futuros = atendimentos.findBySerieIdAndDataGreaterThanEqualAndPresencaAndRemarcadoFalse(
                a.getSerieId(), a.getData(), Presenca.NAO_INFORMADO);
        atendimentos.deleteAll(futuros);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EXCLUSAO,
                "Atendimentos semanais de \"%s\" com \"%s\" encerrados a partir de %s (%d)."
                        .formatted(a.getAluno().getNome(), a.getProfissional().getNome(), Datas.br(a.getData()),
                                futuros.size()),
                ServicoCadastroAtendimento.REF_ALUNO, a.getAluno().getId());
        return futuros.size();
    }

    // ---------- apoio ----------

    private List<Atendimento> buscarSemana(Long unidadeId, Long meuProfissionalId, LocalDate segunda) {
        LocalDate fim = segunda.plusDays(6);
        return meuProfissionalId != null
                ? atendimentos.porPeriodoDoProfissional(unidadeId, meuProfissionalId, segunda, fim)
                : atendimentos.porPeriodo(unidadeId, segunda, fim);
    }

    private static String chave(Atendimento a, long offsetDias) {
        return a.getAluno().getId() + "|" + a.getProfissional().getId() + "|" + offsetDias + "|" + a.getHorario();
    }

    private static LocalDate fimDoAno(LocalDate data) {
        return LocalDate.of(data.getYear(), 12, 31);
    }

    private Profissional profissionalParaEscrita(Long unidadeId, String nomeSubmetido) {
        return cadastro.vinculado() ? cadastro.meuProfissional(unidadeId)
                : cadastro.garantirProfissional(nomeSubmetido, unidadeId);
    }

    private Profissional profissionalEscolhido(Long profissionalId, Long unidadeId, Profissional atual) {
        if (profissionalId == null) {
            return atual;
        }
        return profissionais.findById(profissionalId)
                .filter(p -> p.getUnidadeId().equals(unidadeId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Profissional"));
    }

    /** Nulo para quem gerencia todos os atendimentos da unidade; senão, o id do próprio profissional. */
    private Long meuProfissionalIdOuNull(Long unidadeId) {
        return cadastro.vinculado() ? cadastro.meuProfissional(unidadeId).getId() : null;
    }

    private AtendimentoResposta resposta(Atendimento a) {
        Atendimento copia = a.isRemarcado() ? atendimentos.findByRemarcadoDeId(a.getId()).orElse(null) : null;
        int restantes = a.emSerie()
                ? atendimentos.findBySerieIdAndDataGreaterThanEqualAndPresencaAndRemarcadoFalse(a.getSerieId(),
                        a.getData(), Presenca.NAO_INFORMADO).size()
                : 0;
        return AtendimentoResposta.de(a, copia, restantes);
    }

    private void registrar(Atendimento a, AcaoHistorico acao, String descricao) {
        historico.registrar(ModuloHistorico.ATENDIMENTOS, acao, descricao, REF, a.getId());
    }

    private Atendimento buscarParaLeitura(Long id) {
        Atendimento a = atendimentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Atendimento"));
        contexto.exigirLeitura(a.getUnidadeId());
        exigirProprioSeVinculado(a);
        return a;
    }

    private Atendimento buscarParaEscrita(Long id) {
        Atendimento a = atendimentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Atendimento"));
        contexto.exigirEscrita(a.getUnidadeId());
        exigirProprioSeVinculado(a);
        return a;
    }

    private void exigirProprioSeVinculado(Atendimento a) {
        Long meuProfissionalId = meuProfissionalIdOuNull(a.getUnidadeId());
        if (meuProfissionalId != null && !meuProfissionalId.equals(a.getProfissional().getId())) {
            throw new NaoEncontradoExcecao("Atendimento");
        }
    }
}

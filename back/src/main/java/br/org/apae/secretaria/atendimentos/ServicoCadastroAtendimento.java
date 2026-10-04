package br.org.apae.secretaria.atendimentos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.atendimentos.dto.AlunoResposta;
import br.org.apae.secretaria.atendimentos.dto.ProfissionalResposta;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Alunos e profissionais: cadastros de apoio criados ao digitar o nome num atendimento
 * (old/js/19-atendimentos.js). Professor e profissional (cargo ligado a um profissional
 * por {@code usuarioId}) só usam seu próprio cadastro; não gerenciam os demais.
 */
@Service
@RequiredArgsConstructor
public class ServicoCadastroAtendimento {

    static final String REF_ALUNO = "ALUNO";
    static final String REF_PROFISSIONAL = "PROFISSIONAL";
    private static final List<String> CARGOS_VINCULADOS = List.of("PROFESSOR", "PROFISSIONAL");

    private final AlunoRepositorio alunos;
    private final ProfissionalRepositorio profissionais;
    private final AtendimentoRepositorio atendimentos;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final Relogio relogio;

    // ---------- listagem ----------

    @Transactional(readOnly = true)
    public List<AlunoResposta> listarAlunos() {
        Long unidadeId = contexto.unidadeLeitura();
        return alunos.findByUnidadeIdOrderByNomeAsc(unidadeId).stream()
                .map(a -> AlunoResposta.de(a, atendimentos.countByAlunoId(a.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfissionalResposta> listarProfissionais() {
        Long unidadeId = contexto.unidadeLeitura();
        return profissionais.findByUnidadeIdOrderByNomeAsc(unidadeId).stream()
                .map(p -> ProfissionalResposta.de(p, atendimentos.countByProfissionalId(p.getId())))
                .toList();
    }

    // ---------- gestão (renomear / mesclar / excluir) ----------

    @Transactional
    public void renomearAluno(Long id, String nome) {
        exigirGestorDeCadastros();
        Aluno aluno = buscarAlunoParaEscrita(id);
        aluno.setNome(Textos.limpo(nome));
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EDICAO,
                "Cadastro renomeado para \"%s\".".formatted(aluno.getNome()), REF_ALUNO, id);
    }

    @Transactional
    public void renomearProfissional(Long id, String nome) {
        exigirGestorDeCadastros();
        Profissional profissional = buscarProfissionalParaEscrita(id);
        profissional.setNome(Textos.limpo(nome));
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EDICAO,
                "Cadastro renomeado para \"%s\".".formatted(profissional.getNome()), REF_PROFISSIONAL, id);
    }

    @Transactional
    public void mesclarAluno(Long origemId, Long destinoId) {
        exigirGestorDeCadastros();
        if (origemId.equals(destinoId)) {
            throw new RegraNegocioExcecao("Selecione dois registros diferentes para mesclar.");
        }
        buscarAlunoParaEscrita(origemId);
        Aluno destino = buscarAlunoParaEscrita(destinoId);
        atendimentos.reatribuirAluno(origemId, destinoId);
        alunos.deleteById(origemId);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EDICAO,
                "Cadastro mesclado em \"%s\".".formatted(destino.getNome()), REF_ALUNO, destinoId);
    }

    @Transactional
    public void mesclarProfissional(Long origemId, Long destinoId) {
        exigirGestorDeCadastros();
        if (origemId.equals(destinoId)) {
            throw new RegraNegocioExcecao("Selecione dois registros diferentes para mesclar.");
        }
        buscarProfissionalParaEscrita(origemId);
        Profissional destino = buscarProfissionalParaEscrita(destinoId);
        atendimentos.reatribuirProfissional(origemId, destinoId);
        profissionais.deleteById(origemId);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EDICAO,
                "Cadastro mesclado em \"%s\".".formatted(destino.getNome()), REF_PROFISSIONAL, destinoId);
    }

    @Transactional
    public void excluirAluno(Long id) {
        exigirGestorDeCadastros();
        Aluno aluno = buscarAlunoParaEscrita(id);
        if (atendimentos.countByAlunoId(id) > 0) {
            throw new RegraNegocioExcecao("Não é possível excluir: existem atendimentos com este nome. Mescle-o em outro antes.");
        }
        alunos.delete(aluno);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EXCLUSAO,
                "Cadastro \"%s\" excluído.".formatted(aluno.getNome()), REF_ALUNO, id);
    }

    @Transactional
    public void excluirProfissional(Long id) {
        exigirGestorDeCadastros();
        Profissional profissional = buscarProfissionalParaEscrita(id);
        if (atendimentos.countByProfissionalId(id) > 0) {
            throw new RegraNegocioExcecao("Não é possível excluir: existem atendimentos com este nome. Mescle-o em outro antes.");
        }
        profissionais.delete(profissional);
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EXCLUSAO,
                "Cadastro \"%s\" excluído.".formatted(profissional.getNome()), REF_PROFISSIONAL, id);
    }

    /** Aviso de faltas seguidas: fica quieto até a próxima falta depois desta data. */
    @Transactional
    public void marcarContatoFamilia(Long alunoId) {
        Aluno aluno = buscarAlunoParaEscrita(alunoId);
        LocalDate ultimaFalta = null;
        for (Atendimento a : atendimentos.porAluno(alunoId)) {
            if (!a.efetivo() || a.getPresenca() == Presenca.NAO_INFORMADO) {
                continue;
            }
            if (a.getPresenca() != Presenca.FALTOU) {
                break;
            }
            if (ultimaFalta == null) {
                ultimaFalta = a.getData();
            }
        }
        aluno.setFaltasContatoAte(ultimaFalta != null ? ultimaFalta : relogio.hoje());
        historico.registrar(ModuloHistorico.ATENDIMENTOS, AcaoHistorico.EDICAO,
                "Família de \"%s\" contatada.".formatted(aluno.getNome()), REF_ALUNO, alunoId);
    }

    // ---------- apoio (usado pelo ServicoAtendimento) ----------

    Aluno garantirAluno(String nome, Long unidadeId) {
        String nomeLimpo = Textos.limpo(nome);
        return alunos.findByUnidadeIdAndNomeIgnoreCase(unidadeId, nomeLimpo)
                .orElseGet(() -> alunos.save(new Aluno(unidadeId, nomeLimpo)));
    }

    Profissional garantirProfissional(String nome, Long unidadeId) {
        String nomeLimpo = Textos.limpo(nome);
        return profissionais.findByUnidadeIdAndNomeIgnoreCase(unidadeId, nomeLimpo)
                .orElseGet(() -> profissionais.save(new Profissional(unidadeId, nomeLimpo, null)));
    }

    /** Professor/profissional: cria (na 1ª vez) e devolve o profissional ligado ao próprio usuário. */
    Profissional meuProfissional(Long unidadeId) {
        Long usuarioId = contexto.usuario().id();
        return profissionais.findByUnidadeIdAndUsuarioId(unidadeId, usuarioId)
                .orElseGet(() -> profissionais.save(new Profissional(unidadeId, contexto.usuario().nomeCompleto(), usuarioId)));
    }

    /**
     * Só consulta (não cria): serve às leituras, que rodam em transação somente-leitura. Quem ainda não tem cadastro de
     * profissional recebe 0, que não casa com nenhum atendimento — o cadastro nasce na primeira escrita (meuProfissional).
     */
    Long idDoMeuProfissional(Long unidadeId) {
        return profissionais.findByUnidadeIdAndUsuarioId(unidadeId, contexto.usuario().id()).map(Profissional::getId).orElse(0L);
    }

    /** Verdadeiro para professor/profissional: só enxergam e criam os próprios atendimentos. */
    boolean vinculado() {
        return CARGOS_VINCULADOS.contains(contexto.usuario().cargoCodigo());
    }

    private void exigirGestorDeCadastros() {
        if (vinculado()) {
            throw new AcessoNegadoExcecao("Você não gerencia os cadastros de alunos e profissionais.");
        }
    }

    private Aluno buscarAlunoParaEscrita(Long id) {
        Aluno aluno = alunos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Aluno"));
        contexto.exigirEscrita(aluno.getUnidadeId());
        return aluno;
    }

    private Profissional buscarProfissionalParaEscrita(Long id) {
        Profissional profissional = profissionais.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Profissional"));
        contexto.exigirEscrita(profissional.getUnidadeId());
        return profissional;
    }
}

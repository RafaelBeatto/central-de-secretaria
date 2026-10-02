package br.org.apae.secretaria.vinculos;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.documentos.DocumentoRepositorio;
import br.org.apae.secretaria.empresas.Empresa;
import br.org.apae.secretaria.empresas.EmpresaRepositorio;
import br.org.apae.secretaria.projetos.ExecucaoRepositorio;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.tarefas.TarefaRepositorio;
import br.org.apae.secretaria.vinculos.dto.Vinculado;
import lombok.RequiredArgsConstructor;

/**
 * Vínculos livres entre tarefa, documento, empresa e execução (old/js/12-relacionamentos.js).
 * Quem pode: ler os dois módulos e escrever no do registro de onde parte o vínculo.
 * Depende só dos repositórios, para os serviços de cada módulo poderem limpar os vínculos ao excluir.
 */
@Service
@RequiredArgsConstructor
public class ServicoVinculo {

    private final VinculoRegistroRepositorio vinculos;
    private final TarefaRepositorio tarefas;
    private final DocumentoRepositorio documentos;
    private final EmpresaRepositorio empresas;
    private final ExecucaoRepositorio execucoes;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;

    private record Registro(Long unidadeId, String titulo, String detalhe) {
    }

    // ---------- leitura ----------

    /** Registros ligados a este (os que o usuário não pode ler ficam de fora). */
    @Transactional(readOnly = true)
    public List<Vinculado> doRegistro(TipoRegistro tipo, Long id) {
        exigirLeitura(tipo, id);
        return listar(tipo, id);
    }

    /** Candidatos para ligar: registros da unidade do tipo pedido, menos o próprio e os já ligados. */
    @Transactional(readOnly = true)
    public List<Vinculado> opcoes(TipoRegistro tipo, Long id, TipoRegistro alvo) {
        exigirLeitura(tipo, id);
        exigirPermissao(alvo.permissaoLer());
        Long unidadeId = contexto.unidadeLeitura();
        Set<Long> jaLigados = listar(tipo, id).stream().filter(v -> v.tipo() == alvo).map(Vinculado::id)
                .collect(Collectors.toSet());
        return candidatos(alvo, unidadeId).stream()
                .filter(v -> !jaLigados.contains(v.id()) && !(alvo == tipo && v.id().equals(id))).toList();
    }

    // ---------- escrita ----------

    @Transactional
    public List<Vinculado> adicionar(TipoRegistro tipo, Long id, TipoRegistro alvo, Long alvoId) {
        validarPar(tipo, alvo);
        if (tipo == alvo && id.equals(alvoId)) {
            throw new RegraNegocioExcecao("Um registro não pode ser ligado a ele mesmo.");
        }
        exigirPermissao(tipo.permissaoEscrever());
        exigirPermissao(alvo.permissaoLer());
        Long unidadeId = contexto.unidadeEscrita();
        Registro origem = registro(tipo, id);
        Registro destino = registro(alvo, alvoId);
        if (!unidadeId.equals(origem.unidadeId()) || !unidadeId.equals(destino.unidadeId())) {
            throw new AcessoNegadoExcecao("Só é possível ligar registros da sua unidade.");
        }
        VinculoRegistro v = VinculoRegistro.entre(unidadeId, tipo, id, alvo, alvoId);
        if (vinculos.existsByOrigemTipoAndOrigemIdAndDestinoTipoAndDestinoId(v.getOrigemTipo(), v.getOrigemId(),
                v.getDestinoTipo(), v.getDestinoId())) {
            throw new RegraNegocioExcecao("Estes registros já estão ligados.");
        }
        vinculos.save(v);
        historico.registrar(tipo.modulo(), AcaoHistorico.VINCULO,
                "Ligado a %s \"%s\".".formatted(rotulo(alvo), destino.titulo()), tipo.name(), id);
        historico.registrar(alvo.modulo(), AcaoHistorico.VINCULO,
                "Ligado a %s \"%s\".".formatted(rotulo(tipo), origem.titulo()), alvo.name(), alvoId);
        return listar(tipo, id);
    }

    @Transactional
    public List<Vinculado> remover(TipoRegistro tipo, Long id, TipoRegistro alvo, Long alvoId) {
        exigirPermissao(tipo.permissaoEscrever());
        Long unidadeId = contexto.unidadeEscrita();
        Registro origem = registro(tipo, id);
        if (!unidadeId.equals(origem.unidadeId())) {
            throw new AcessoNegadoExcecao("Só é possível alterar registros da sua unidade.");
        }
        VinculoRegistro v = vinculos.doRegistro(tipo, id).stream().filter(x -> x.deste(alvo, alvoId))
                .findFirst().orElseThrow(() -> new NaoEncontradoExcecao("Vínculo"));
        vinculos.delete(v);
        String tituloAlvo = existe(alvo, alvoId) ? registro(alvo, alvoId).titulo() : rotulo(alvo);
        historico.registrar(tipo.modulo(), AcaoHistorico.DESVINCULO,
                "Desligado de %s \"%s\".".formatted(rotulo(alvo), tituloAlvo), tipo.name(), id);
        return listar(tipo, id);
    }

    /** Chamado pelos módulos ao excluir um registro: some junto com os vínculos dele. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void removerDoRegistro(TipoRegistro tipo, Long id) {
        vinculos.apagarDoRegistro(tipo, id);
    }

    // ---------- apoio ----------

    private List<Vinculado> listar(TipoRegistro tipo, Long id) {
        UsuarioAutenticado usuario = contexto.usuario();
        return vinculos.doRegistro(tipo, id).stream().map(v -> {
            boolean origem = v.getOrigemTipo() == tipo && v.getOrigemId().equals(id);
            return origem ? new Par(v.getDestinoTipo(), v.getDestinoId()) : new Par(v.getOrigemTipo(), v.getOrigemId());
        }).filter(p -> usuario.possui(p.tipo().permissaoLer()) && existe(p.tipo(), p.id()))
                .map(p -> {
                    Registro r = registro(p.tipo(), p.id());
                    return new Vinculado(p.tipo(), p.id(), r.titulo(), r.detalhe());
                }).toList();
    }

    private record Par(TipoRegistro tipo, Long id) {
    }

    private List<Vinculado> candidatos(TipoRegistro alvo, Long unidadeId) {
        return switch (alvo) {
            case TAREFA -> tarefas.findByUnidadeId(unidadeId).stream()
                    .map(t -> new Vinculado(alvo, t.getId(), t.getTitulo(), t.getCodigo())).toList();
            case DOCUMENTO -> documentos.findByUnidadeIdOrderByNomeAsc(unidadeId).stream()
                    .map(d -> new Vinculado(alvo, d.getId(), d.getNome(), d.getCodigo())).toList();
            case EMPRESA -> empresas.findByUnidadeIdOrderByRazaoSocialAsc(unidadeId).stream()
                    .map(e -> new Vinculado(alvo, e.getId(), nomeEmpresa(e), e.getCnpj())).toList();
            case EXECUCAO -> execucoes.findByUnidadeId(unidadeId).stream()
                    .map(e -> new Vinculado(alvo, e.getId(), e.getNome(), e.getCodigo())).toList();
        };
    }

    private static String nomeEmpresa(Empresa e) {
        return e.getRazaoSocial() != null ? e.getRazaoSocial() : e.getNomeFantasia();
    }

    private boolean existe(TipoRegistro tipo, Long id) {
        return switch (tipo) {
            case TAREFA -> tarefas.existsById(id);
            case DOCUMENTO -> documentos.existsById(id);
            case EMPRESA -> empresas.existsById(id);
            case EXECUCAO -> execucoes.existsById(id);
        };
    }

    private Registro registro(TipoRegistro tipo, Long id) {
        return switch (tipo) {
            case TAREFA -> tarefas.findById(id).map(t -> new Registro(t.getUnidadeId(), t.getTitulo(), t.getCodigo()))
                    .orElseThrow(() -> new NaoEncontradoExcecao("Tarefa"));
            case DOCUMENTO -> documentos.findById(id)
                    .map(d -> new Registro(d.getUnidadeId(), d.getNome(), d.getCodigo()))
                    .orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
            case EMPRESA -> empresas.findById(id)
                    .map(e -> new Registro(e.getUnidadeId(), nomeEmpresa(e), e.getCnpj()))
                    .orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
            case EXECUCAO -> execucoes.findById(id)
                    .map(e -> new Registro(e.getUnidadeId(), e.getNome(), e.getCodigo()))
                    .orElseThrow(() -> new NaoEncontradoExcecao("Execução"));
        };
    }

    private void exigirLeitura(TipoRegistro tipo, Long id) {
        exigirPermissao(tipo.permissaoLer());
        contexto.exigirLeitura(registro(tipo, id).unidadeId());
    }

    private void exigirPermissao(String permissao) {
        if (!contexto.usuario().possui(permissao)) {
            throw new AcessoNegadoExcecao("Você não tem permissão para esta operação.");
        }
    }

    private static void validarPar(TipoRegistro a, TipoRegistro b) {
        if (!a.pode(b)) {
            throw new RegraNegocioExcecao(a == b ? "Escolha outro tipo de registro para ligar."
                    : "Empresa e execução se ligam em Projetos, pela opção \"Ligar empresa\".");
        }
    }

    private static String rotulo(TipoRegistro tipo) {
        return switch (tipo) {
            case TAREFA -> "tarefa";
            case DOCUMENTO -> "documento";
            case EMPRESA -> "empresa";
            case EXECUCAO -> "execução";
        };
    }
}

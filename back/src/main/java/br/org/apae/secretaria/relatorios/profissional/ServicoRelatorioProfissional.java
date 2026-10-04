package br.org.apae.secretaria.relatorios.profissional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.usuario.Usuario;
import br.org.apae.secretaria.acesso.usuario.UsuarioRepositorio;
import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.relatorios.profissional.dto.ProfissionalCentral;
import br.org.apae.secretaria.relatorios.profissional.dto.RelatorioProfissionalResposta;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoCobrancaRelatorio;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoEntregaRelatorio;
import br.org.apae.secretaria.relatorios.profissional.dto.RequisicaoRelatorioProfissional;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.arquivo.Arquivo;
import br.org.apae.secretaria.sistema.arquivo.ArquivoRepositorio;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Relatórios em PDF de professores e profissionais.
 * - O autor só enxerga os próprios.
 * - A Central (RELATORIO_PROF_LER) lê os da unidade consultada (a própria ou uma subordinada, via X-Unidade).
 * Nenhuma rota recebe o id do arquivo: o PDF abre pelo id do relatório, depois da conferência de quem pode vê-lo.
 */
@Service
@RequiredArgsConstructor
public class ServicoRelatorioProfissional {

    private static final String REF = "RELATORIO_PROFISSIONAL";
    private static final String PERMISSAO_CENTRAL = "RELATORIO_PROF_LER";
    private static final String CARGO_PROFESSOR = "PROFESSOR";
    private static final String CARGO_PROFISSIONAL = "PROFISSIONAL";
    private static final LocalDate MUITO_ANTIGA = LocalDate.of(1900, 1, 1);
    private static final LocalDate MUITO_FUTURA = LocalDate.of(2999, 12, 31);

    private final RelatorioProfissionalRepositorio relatorios;
    private final ArquivoRepositorio arquivos;
    private final ServicoArquivo servicoArquivo;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final UsuarioRepositorio usuarios;
    private final Relogio relogio;

    @Transactional
    public RelatorioProfissionalResposta enviar(RequisicaoRelatorioProfissional r) {
        UsuarioAutenticado usuario = contexto.usuario();
        Long unidadeId = contexto.unidadeEscrita();
        Arquivo arquivo = arquivoDoUsuario(r.arquivoId(), usuario);
        Periodo periodo = periodo(r.periodoInicio(), r.periodoFim());
        RelatorioProfissional relatorio = relatorios.save(new RelatorioProfissional(unidadeId, usuario.id(),
                usuario.nomeCompleto(), usuario.cargoNome(), Textos.limpo(r.nome()), r.tipo(),
                r.tipo() == TipoRelatorio.PESSOAL ? Textos.limpo(r.nomeAluno()) : null, Textos.limpo(r.complemento()),
                periodo.inicio(), periodo.fim(), arquivo.getId()));
        historico.registrar(ModuloHistorico.RELATORIOS, AcaoHistorico.CRIACAO,
                "Relatório \"%s\" de %s enviado (período %s a %s).".formatted(relatorio.getNome(),
                        usuario.nomeCompleto(), Datas.br(periodo.inicio()), Datas.br(periodo.fim())),
                REF, relatorio.getId());
        return resposta(List.of(relatorio)).get(0);
    }

    /** O profissional atende a uma cobrança enviando o PDF. */
    @Transactional
    public RelatorioProfissionalResposta entregar(Long id, RequisicaoEntregaRelatorio r) {
        UsuarioAutenticado usuario = contexto.usuario();
        RelatorioProfissional relatorio = relatorios.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Relatório"));
        if (!usuario.id().equals(relatorio.getUsuarioId())) {
            throw new NaoEncontradoExcecao("Relatório");
        }
        contexto.exigirEscrita(relatorio.getUnidadeId());
        if (!relatorio.pendente()) {
            throw new RegraNegocioExcecao("Este relatório já foi entregue.");
        }
        Arquivo arquivo = arquivoDoUsuario(r.arquivoId(), usuario);
        Periodo periodo = periodo(r.periodoInicio(), r.periodoFim());
        relatorio.entregar(arquivo.getId(), periodo.inicio(), periodo.fim());
        historico.registrar(ModuloHistorico.RELATORIOS, AcaoHistorico.CRIACAO,
                "Relatório \"%s\" de %s entregue.".formatted(relatorio.getNome(), usuario.nomeCompleto()),
                REF, relatorio.getId());
        return resposta(List.of(relatorio)).get(0);
    }

    /** Central: pede a um professor/profissional da própria unidade que produza um relatório (fica Pendente para ele). */
    @Transactional
    public RelatorioProfissionalResposta cobrar(Long usuarioId, RequisicaoCobrancaRelatorio r) {
        Long unidadeId = contexto.unidadeEscrita();
        Usuario alvo = usuarios.findComCargoEUnidadeById(usuarioId).orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
        if (!alvo.getUnidade().getId().equals(unidadeId)) {
            throw new NaoEncontradoExcecao("Usuário");
        }
        String cargo = alvo.getCargo().getCodigo();
        if (!alvo.isAtivo() || !(CARGO_PROFESSOR.equals(cargo) || CARGO_PROFISSIONAL.equals(cargo))) {
            throw new RegraNegocioExcecao("Só é possível cobrar relatório de professor ou profissional ativo.");
        }
        RelatorioProfissional relatorio = relatorios.save(RelatorioProfissional.cobranca(unidadeId, alvo.getId(),
                alvo.nomeCompleto(), alvo.getCargo().getNome(), Textos.limpo(r.nome()), r.tipo(),
                r.tipo() == TipoRelatorio.PESSOAL ? Textos.limpo(r.nomeAluno()) : null, Textos.limpo(r.complemento()),
                relogio.hoje(), contexto.usuario().id()));
        historico.registrar(ModuloHistorico.RELATORIOS, AcaoHistorico.CRIACAO,
                "Relatório \"%s\" cobrado de %s.".formatted(relatorio.getNome(), alvo.nomeCompleto()), REF,
                relatorio.getId());
        return resposta(List.of(relatorio)).get(0);
    }

    /** PDF enviado pelo próprio usuário, ainda sem relatório. */
    private Arquivo arquivoDoUsuario(Long arquivoId, UsuarioAutenticado usuario) {
        Arquivo arquivo = servicoArquivo.exigirCategoria(arquivoId, CategoriaArquivo.RELATORIO_PROFISSIONAL);
        if (!usuario.id().equals(arquivo.getEnviadoPorId())) {
            throw new NaoEncontradoExcecao("Arquivo");
        }
        if (relatorios.existsByArquivoId(arquivo.getId())) {
            throw new RegraNegocioExcecao("Este arquivo já foi usado em outro relatório.");
        }
        return arquivo;
    }

    /** Sem "de" vale hoje (ou o "até", se já passou); sem "até" vale o início. */
    private Periodo periodo(LocalDate de, LocalDate ate) {
        LocalDate hoje = relogio.hoje();
        LocalDate inicio = de != null ? de : (ate != null && ate.isBefore(hoje) ? ate : hoje);
        return new Periodo(inicio, ate != null ? ate : inicio);
    }

    private record Periodo(LocalDate inicio, LocalDate fim) {
    }

    /** Os relatórios que o próprio usuário enviou. */
    @Transactional(readOnly = true)
    public List<RelatorioProfissionalResposta> meus() {
        return resposta(relatorios.findByUsuarioIdOrderByPeriodoInicioDescEnviadoEmDesc(contexto.usuario().id()));
    }

    /** Central: profissionais da unidade consultada com o total de relatórios que atendem aos filtros. */
    @Transactional(readOnly = true)
    public List<ProfissionalCentral> profissionais(String busca, Integer ano, LocalDate de, LocalDate ate,
            StatusRelatorio status) {
        Filtros f = new Filtros(ano, de, ate, status);
        long minimo = f.ativo ? 1 : 0;
        return relatorios.profissionaisComTotal(contexto.unidadeLeitura(), busca == null ? "" : busca.strip(),
                f.inicioMin, f.inicioMax, f.de, f.ate, f.status, minimo);
    }

    /** Central: relatórios de um profissional (só os da unidade consultada). */
    @Transactional(readOnly = true)
    public List<RelatorioProfissionalResposta> doProfissional(Long usuarioId, Integer ano, LocalDate de,
            LocalDate ate, StatusRelatorio status) {
        Filtros f = new Filtros(ano, de, ate, status);
        return resposta(relatorios.filtrar(usuarioId, contexto.unidadeLeitura(), f.inicioMin, f.inicioMax, f.de,
                f.ate, f.status));
    }

    /** Link temporário do PDF: o autor ou quem tem acesso à Central na unidade do relatório. */
    @Transactional(readOnly = true)
    public String url(Long id) {
        RelatorioProfissional r = relatorios.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Relatório"));
        UsuarioAutenticado usuario = contexto.usuario();
        if (!usuario.id().equals(r.getUsuarioId())) {
            if (!usuario.possui(PERMISSAO_CENTRAL)) {
                throw new NaoEncontradoExcecao("Relatório");
            }
            contexto.exigirLeitura(r.getUnidadeId());
        }
        if (r.getArquivoId() == null) {
            throw new NaoEncontradoExcecao("Arquivo");
        }
        return servicoArquivo.urlTemporariaAutorizada(r.getArquivoId());
    }

    private List<RelatorioProfissionalResposta> resposta(List<RelatorioProfissional> lista) {
        Map<Long, Arquivo> porId = arquivos.findAllById(
                lista.stream().map(RelatorioProfissional::getArquivoId).filter(Objects::nonNull).toList()).stream()
                .collect(Collectors.toMap(Arquivo::getId, Function.identity()));
        return lista.stream().map(r -> {
            Arquivo a = r.getArquivoId() == null ? null : porId.get(r.getArquivoId());
            return RelatorioProfissionalResposta.de(r, a == null ? null : a.getNomeOriginal(),
                    a == null ? null : a.getTamanhoBytes());
        }).toList();
    }

    /** Filtros da Central já em intervalos fechados (sem {@code null}). */
    private static final class Filtros {
        final LocalDate inicioMin;
        final LocalDate inicioMax;
        final LocalDate de;
        final LocalDate ate;
        final String status;
        final boolean ativo;

        Filtros(Integer ano, LocalDate de, LocalDate ate, StatusRelatorio status) {
            this.inicioMin = ano == null ? MUITO_ANTIGA : LocalDate.of(ano, 1, 1);
            this.inicioMax = ano == null ? MUITO_FUTURA : LocalDate.of(ano, 12, 31);
            this.de = de == null ? MUITO_ANTIGA : de;
            this.ate = ate == null ? MUITO_FUTURA : ate;
            this.status = status == null ? "" : status.name();
            this.ativo = ano != null || de != null || ate != null || status != null;
        }
    }
}

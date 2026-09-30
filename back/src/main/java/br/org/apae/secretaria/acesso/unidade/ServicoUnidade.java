package br.org.apae.secretaria.acesso.unidade;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.unidade.dto.RequisicaoDadosInstitucionais;
import br.org.apae.secretaria.acesso.unidade.dto.RequisicaoUnidade;
import br.org.apae.secretaria.acesso.unidade.dto.UnidadeDetalhe;
import br.org.apae.secretaria.acesso.unidade.dto.UnidadeResumo;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.comum.validacao.DocumentoFiscal;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.ServicoUsuarioAutenticado;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ServicoUnidade {

    private static final String REF = "UNIDADE";

    private final UnidadeRepositorio repositorio;
    private final ContextoSeguranca contexto;
    private final ServicoArquivo servicoArquivo;
    private final ServicoHistorico historico;
    private final ServicoUsuarioAutenticado servicoUsuario;

    /** A unidade do usuário e todas as subordinadas: alimenta o seletor "Visualizando". */
    @Transactional(readOnly = true)
    public List<UnidadeResumo> arvore() {
        UsuarioAutenticado usuario = contexto.usuario();
        int base = (int) usuario.caminhoUnidade().chars().filter(c -> c == '/').count() - 2;
        return repositorio.buscarArvore(usuario.caminhoUnidade()).stream()
                .map(u -> UnidadeResumo.de(u, base))
                .toList();
    }

    /** Unidade sendo consultada no momento (dados do cabeçalho dos PDFs). */
    @Transactional(readOnly = true)
    public UnidadeDetalhe atual() {
        return UnidadeDetalhe.de(buscar(contexto.unidadeLeitura()));
    }

    @Transactional(readOnly = true)
    public UnidadeDetalhe detalhe(Long id) {
        contexto.exigirLeitura(id);
        return UnidadeDetalhe.de(buscar(id));
    }

    @Transactional
    public UnidadeDetalhe criarSubordinada(RequisicaoUnidade requisicao) {
        Unidade pai = buscar(requisicao.unidadePaiId());
        if (!contexto.usuario().alcanca(pai.getCaminho())) {
            throw new NaoEncontradoExcecao("Unidade");
        }
        if (pai.getTipo().tipoDasSubordinadas().isEmpty()) {
            throw new RegraNegocioExcecao("Uma APAE municipal não tem unidades subordinadas.");
        }
        String nome = Textos.limpo(requisicao.nome());
        if (repositorio.existsByUnidadePaiIdAndNomeIgnoreCase(pai.getId(), nome)) {
            throw new RegraNegocioExcecao("Já existe uma unidade com esse nome em " + pai.getNome() + ".");
        }
        Unidade unidade = Unidade.subordinadaDe(pai, nome);
        aplicar(unidade, requisicao);
        repositorio.saveAndFlush(unidade);
        unidade.definirCaminho();
        historico.registrar(ModuloHistorico.UNIDADES, AcaoHistorico.CRIACAO,
                "Unidade \"%s\" criada em \"%s\".".formatted(nome, pai.getNome()), REF, unidade.getId());
        return UnidadeDetalhe.de(unidade);
    }

    @Transactional
    public UnidadeDetalhe atualizarSubordinada(Long id, RequisicaoUnidade requisicao) {
        Unidade unidade = buscar(id);
        UsuarioAutenticado usuario = contexto.usuario();
        if (id.equals(usuario.unidadeId())) {
            throw new AcessoNegadoExcecao("A própria unidade é alterada em \"Dados da instituição\".");
        }
        if (!usuario.alcanca(unidade.getCaminho())) {
            throw new NaoEncontradoExcecao("Unidade");
        }
        String nome = Textos.limpo(requisicao.nome());
        Long paiId = unidade.getUnidadePai().getId();
        if (repositorio.existsByUnidadePaiIdAndNomeIgnoreCaseAndIdNot(paiId, nome, id)) {
            throw new RegraNegocioExcecao("Já existe outra unidade com esse nome no mesmo nível.");
        }
        unidade.setNome(nome);
        aplicar(unidade, requisicao);
        // Usuários da unidade veem o novo nome/situação na hora.
        servicoUsuario.esquecerTodos();
        historico.registrar(ModuloHistorico.UNIDADES, AcaoHistorico.EDICAO,
                "Unidade \"%s\" alterada.".formatted(nome), REF, id);
        return UnidadeDetalhe.de(unidade);
    }

    @Transactional
    public UnidadeDetalhe atualizarDadosInstitucionais(RequisicaoDadosInstitucionais r) {
        Unidade unidade = buscar(contexto.unidadeEscrita());
        Long logoAnterior = unidade.getLogoArquivoId();
        if (r.logoArquivoId() != null && !r.logoArquivoId().equals(logoAnterior)) {
            var logo = servicoArquivo.buscarParaVincular(r.logoArquivoId());
            if (logo.getCategoria() != CategoriaArquivo.LOGO) {
                throw new RegraNegocioExcecao("O arquivo enviado não é uma imagem de logo.");
            }
        }
        unidade.setNome(Textos.limpo(r.nome()));
        unidade.setCnpj(r.cnpj() == null || r.cnpj().isBlank() ? null : DocumentoFiscal.formatarCnpj(r.cnpj()));
        unidade.setEndereco(Textos.limpo(r.endereco()));
        unidade.setTelefone(Textos.limpo(r.telefone()));
        unidade.setEmail(Textos.limpo(r.email()));
        unidade.setCidadeUf(Textos.limpo(r.cidadeUf()));
        unidade.setSite(Textos.limpo(r.site()));
        unidade.setPresidente(Textos.limpo(r.presidente()));
        unidade.setCpfPresidente(r.cpfPresidente() == null || r.cpfPresidente().isBlank() ? null : DocumentoFiscal.formatarCpf(r.cpfPresidente()));
        unidade.setRodapeTexto(Textos.limpo(r.rodapeTexto()));
        unidade.setRodapeEndereco(r.rodapeEndereco());
        unidade.setRodapeTelefone(r.rodapeTelefone());
        unidade.setRodapeEmail(r.rodapeEmail());
        unidade.setRodapeSite(r.rodapeSite());
        unidade.setRodapeMostrarPagina(r.rodapeMostrarPagina());
        unidade.setLogoArquivoId(r.logoArquivoId());
        if (logoAnterior != null && !Objects.equals(logoAnterior, r.logoArquivoId())) {
            servicoArquivo.excluir(logoAnterior);
        }
        servicoUsuario.esquecerTodos();
        historico.registrar(ModuloHistorico.UNIDADES, AcaoHistorico.EDICAO,
                "Dados da instituição atualizados.", REF, unidade.getId());
        return UnidadeDetalhe.de(unidade);
    }

    private Unidade buscar(Long id) {
        return repositorio.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Unidade"));
    }

    private static void aplicar(Unidade unidade, RequisicaoUnidade requisicao) {
        unidade.setUf(Textos.maiusculo(requisicao.uf()));
        unidade.setMunicipio(Textos.limpo(requisicao.municipio()));
        unidade.setAtivo(requisicao.ativo());
    }
}

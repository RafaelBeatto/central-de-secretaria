package br.org.apae.secretaria.empresas;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.comum.validacao.DocumentoFiscal;
import br.org.apae.secretaria.empresas.dto.EmpresaCriada;
import br.org.apae.secretaria.empresas.dto.EmpresaDocumentoResposta;
import br.org.apae.secretaria.empresas.dto.EmpresaResposta;
import br.org.apae.secretaria.empresas.dto.RequisicaoEmpresa;
import br.org.apae.secretaria.empresas.dto.RequisicaoEmpresaDocumento;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.arquivo.Arquivo;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Empresas (fornecedores) e os documentos da ficha delas (old/js/04-projetos.js:
 * gerador-empresas). Mesmo CNPJ ou mesma razão social = mesma empresa: o cadastro
 * devolve a existente em vez de duplicar, e a edição recusa repetir os de outra.
 */
@Service
@RequiredArgsConstructor
public class ServicoEmpresa {

    private static final String REF = "EMPRESA";

    private final EmpresaRepositorio empresas;
    private final EmpresaDocumentoRepositorio documentos;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoArquivo servicoArquivo;

    @Transactional(readOnly = true)
    public List<EmpresaResposta> itens() {
        List<Empresa> lista = empresas.findByUnidadeIdOrderByRazaoSocialAsc(contexto.unidadeLeitura());
        Map<Long, List<EmpresaDocumentoResposta>> docsPorEmpresa = documentos
                .findByEmpresaIdInOrderByNomeAsc(lista.stream().map(Empresa::getId).toList()).stream()
                .collect(Collectors.groupingBy(EmpresaDocumento::getEmpresaId,
                        Collectors.mapping(EmpresaDocumentoResposta::de, Collectors.toList())));
        return lista.stream().map(e -> EmpresaResposta.de(e, docsPorEmpresa.getOrDefault(e.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public EmpresaResposta detalhe(Long id) {
        return resposta(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Empresa e = buscarParaLeitura(id);
        return historico.doRegistro(e.getUnidadeId(), REF, id);
    }

    @Transactional
    public EmpresaCriada criar(RequisicaoEmpresa r) {
        Long unidadeId = contexto.unidadeEscrita();
        String razaoSocial = Textos.limpo(r.razaoSocial());
        String cnpj = cnpj(r.cnpj());
        Optional<Empresa> existente = mesmaEmpresa(unidadeId, cnpj, razaoSocial, null);
        if (existente.isPresent()) {
            return new EmpresaCriada(resposta(existente.get()), true);
        }
        Empresa e = new Empresa(unidadeId, razaoSocial, Textos.limpo(r.nomeFantasia()), cnpj,
                Textos.limpo(r.telefone()), Textos.limpo(r.email()), Textos.limpo(r.endereco()),
                Textos.limpo(r.municipio()), Textos.maiusculo(r.uf()), Textos.limpo(r.representante()),
                cpf(r.cpfRepresentante()), Textos.limpo(r.observacao()));
        empresas.save(e);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.CRIACAO,
                "Empresa \"%s\" cadastrada.".formatted(razaoSocial), REF, e.getId());
        return new EmpresaCriada(EmpresaResposta.de(e, List.of()), false);
    }

    @Transactional
    public EmpresaResposta atualizar(Long id, RequisicaoEmpresa r) {
        Empresa e = buscarParaEscrita(id);
        String razaoSocial = Textos.limpo(r.razaoSocial());
        String cnpj = cnpj(r.cnpj());
        mesmaEmpresa(e.getUnidadeId(), cnpj, razaoSocial, id).ifPresent(outra -> {
            String pelo = cnpj != null && cnpj.equals(outra.getCnpj()) ? "CNPJ" : "nome";
            throw new RegraNegocioExcecao(
                    "Já existe outra empresa cadastrada com esse %s: \"%s\".".formatted(pelo, outra.getRazaoSocial()));
        });
        e.setRazaoSocial(razaoSocial);
        e.setNomeFantasia(Textos.limpo(r.nomeFantasia()));
        e.setCnpj(cnpj);
        e.setTelefone(Textos.limpo(r.telefone()));
        e.setEmail(Textos.limpo(r.email()));
        e.setEndereco(Textos.limpo(r.endereco()));
        e.setMunicipio(Textos.limpo(r.municipio()));
        e.setUf(Textos.maiusculo(r.uf()));
        e.setRepresentante(Textos.limpo(r.representante()));
        e.setCpfRepresentante(cpf(r.cpfRepresentante()));
        e.setObservacao(Textos.limpo(r.observacao()));
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.EDICAO,
                "Dados da empresa \"%s\" atualizados.".formatted(razaoSocial), REF, id);
        return resposta(e);
    }

    @Transactional
    public void excluir(Long id) {
        Empresa e = buscarParaEscrita(id);
        String nome = e.getRazaoSocial();
        List<Long> arquivos = documentos.findByEmpresaIdOrderByNomeAsc(id).stream().map(EmpresaDocumento::getArquivoId)
                .toList();
        empresas.delete(e);
        arquivos.forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.EXCLUSAO,
                "Empresa \"%s\" excluída.".formatted(nome), REF, id);
    }

    @Transactional
    public EmpresaResposta adicionarDocumento(Long empresaId, RequisicaoEmpresaDocumento r) {
        Empresa e = buscarParaEscrita(empresaId);
        Arquivo arquivo = servicoArquivo.buscarParaVincular(r.arquivoId());
        if (arquivo.getCategoria() != CategoriaArquivo.DOCUMENTO_EMPRESA) {
            throw new RegraNegocioExcecao("O arquivo enviado não é um documento de empresa.");
        }
        EmpresaDocumento doc = new EmpresaDocumento(empresaId, Textos.limpo(r.nome()), r.dataValidade(),
                Textos.limpo(r.observacao()), r.arquivoId());
        documentos.save(doc);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.DOCUMENTO,
                "Documento \"%s\" adicionado à empresa \"%s\".".formatted(doc.getNome(), e.getRazaoSocial()), REF,
                empresaId);
        return resposta(e);
    }

    @Transactional
    public EmpresaResposta excluirDocumento(Long empresaId, Long documentoId) {
        Empresa e = buscarParaEscrita(empresaId);
        EmpresaDocumento doc = documentos.findById(documentoId)
                .filter(d -> d.getEmpresaId().equals(empresaId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        String nome = doc.getNome();
        Long arquivoId = doc.getArquivoId();
        documentos.delete(doc);
        servicoArquivo.excluir(arquivoId);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.EXCLUSAO,
                "Documento \"%s\" excluído da empresa \"%s\".".formatted(nome, e.getRazaoSocial()), REF, empresaId);
        return resposta(e);
    }

    /** Outra empresa da unidade com o mesmo CNPJ ou, senão, com a mesma razão social. */
    private Optional<Empresa> mesmaEmpresa(Long unidadeId, String cnpj, String razaoSocial, Long ignorarId) {
        Optional<Empresa> peloCnpj = cnpj == null ? Optional.empty() : empresas.findByUnidadeIdAndCnpj(unidadeId, cnpj);
        return peloCnpj.filter(outra -> !Objects.equals(outra.getId(), ignorarId))
                .or(() -> empresas.findByUnidadeIdAndRazaoSocialIgnoreCase(unidadeId, razaoSocial)
                        .filter(outra -> !Objects.equals(outra.getId(), ignorarId)));
    }

    /** CNPJ e CPF ficam sempre formatados, para a busca por igualdade funcionar. */
    private static String cnpj(String valor) {
        String limpo = Textos.limpo(valor);
        return limpo == null ? null : DocumentoFiscal.formatarCnpj(limpo);
    }

    private static String cpf(String valor) {
        String limpo = Textos.limpo(valor);
        return limpo == null ? null : DocumentoFiscal.formatarCpf(limpo);
    }

    private EmpresaResposta resposta(Empresa e) {
        return EmpresaResposta.de(e,
                documentos.findByEmpresaIdOrderByNomeAsc(e.getId()).stream().map(EmpresaDocumentoResposta::de).toList());
    }

    private Empresa buscarParaLeitura(Long id) {
        Empresa e = empresas.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        contexto.exigirLeitura(e.getUnidadeId());
        return e;
    }

    private Empresa buscarParaEscrita(Long id) {
        Empresa e = empresas.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        contexto.exigirEscrita(e.getUnidadeId());
        return e;
    }
}

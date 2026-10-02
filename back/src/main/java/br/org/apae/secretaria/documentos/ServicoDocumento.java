package br.org.apae.secretaria.documentos;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.documentos.dto.DocumentoResposta;
import br.org.apae.secretaria.documentos.dto.DocumentoVersaoResposta;
import br.org.apae.secretaria.documentos.dto.RequisicaoDocumento;
import br.org.apae.secretaria.documentos.dto.RequisicaoRenovarDocumento;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.vinculos.ServicoVinculo;
import br.org.apae.secretaria.vinculos.TipoRegistro;
import br.org.apae.secretaria.sistema.arquivo.Arquivo;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import lombok.RequiredArgsConstructor;

/**
 * Documentos institucionais com validade e histórico de versões (old/js/06-documentos.js).
 * A lista vem inteira para a unidade; vencido/vencendo/válido/sem-validade é calculado
 * no front, igual ao antigo (evita repetir o cálculo dos dois lados).
 */
@Service
@RequiredArgsConstructor
public class ServicoDocumento {

    private static final String REF = "DOCUMENTO";

    private final ServicoVinculo servicoVinculo;
    private final DocumentoRepositorio documentos;
    private final DocumentoVersaoRepositorio versoes;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoNumeracao numeracao;
    private final ServicoArquivo servicoArquivo;

    @Transactional(readOnly = true)
    public List<DocumentoResposta> itens() {
        Long unidadeId = contexto.unidadeLeitura();
        return documentos.findByUnidadeIdOrderByNomeAsc(unidadeId).stream()
                .map(d -> DocumentoResposta.de(d, List.of()))
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentoResposta detalhe(Long id) {
        Documento d = buscarParaLeitura(id);
        return resposta(d);
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Documento d = buscarParaLeitura(id);
        return historico.doRegistro(d.getUnidadeId(), REF, id);
    }

    @Transactional
    public DocumentoResposta criar(RequisicaoDocumento r) {
        Long unidadeId = contexto.unidadeEscrita();
        Long arquivoId = validarArquivo(r.arquivoId());
        String codigo = numeracao.codigo("DOC", unidadeId);
        Documento d = new Documento(unidadeId, codigo, Textos.limpo(r.nome()), r.categoria(), r.exigenciaApae(),
                Textos.limpo(r.numero()), Textos.limpo(r.orgao()), Textos.limpo(r.responsavel()), r.dataEmissao(),
                r.dataValidade(), Textos.limpo(r.localGuardado()), Textos.limpo(r.tags()), Textos.limpo(r.descricao()),
                Textos.limpo(r.observacoes()), arquivoId, contexto.usuario().id());
        documentos.save(d);
        historico.registrar(ModuloHistorico.DOCUMENTOS, AcaoHistorico.CRIACAO,
                "Documento \"%s\" cadastrado.".formatted(d.getNome()), REF, d.getId());
        return resposta(d);
    }

    @Transactional
    public DocumentoResposta atualizar(Long id, RequisicaoDocumento r) {
        Documento d = buscarParaEscrita(id);
        Long arquivoAnterior = d.getArquivoId();
        if (r.arquivoId() != null && !r.arquivoId().equals(arquivoAnterior)) {
            d.setArquivoId(validarArquivo(r.arquivoId()));
            if (arquivoAnterior != null) {
                servicoArquivo.excluir(arquivoAnterior);
            }
        }
        d.setNome(Textos.limpo(r.nome()));
        d.setCategoria(r.categoria());
        d.setExigenciaApae(r.exigenciaApae());
        d.setNumero(Textos.limpo(r.numero()));
        d.setOrgao(Textos.limpo(r.orgao()));
        d.setResponsavel(Textos.limpo(r.responsavel()));
        d.setDataEmissao(r.dataEmissao());
        d.setDataValidade(r.dataValidade());
        d.setLocalGuardado(Textos.limpo(r.localGuardado()));
        d.setTags(Textos.limpo(r.tags()));
        d.setDescricao(Textos.limpo(r.descricao()));
        d.setObservacoes(Textos.limpo(r.observacoes()));
        historico.registrar(ModuloHistorico.DOCUMENTOS, AcaoHistorico.EDICAO,
                "Documento \"%s\" editado.".formatted(d.getNome()), REF, id);
        return resposta(d);
    }

    /** Guarda número/emissão/validade/arquivo atuais como versão anterior e assume os novos. */
    @Transactional
    public DocumentoResposta renovar(Long id, RequisicaoRenovarDocumento r) {
        Documento d = buscarParaEscrita(id);
        String validadeAnterior = d.getDataValidade() != null ? Datas.br(d.getDataValidade()) : "sem validade";
        Long novoArquivoId = validarArquivo(r.arquivoId());
        DocumentoVersao versaoAnterior = d.renovar(r.dataEmissao(), r.dataValidade(), Textos.limpo(r.numero()),
                novoArquivoId);
        versoes.save(versaoAnterior);
        historico.registrar(ModuloHistorico.DOCUMENTOS, AcaoHistorico.RENOVACAO,
                "Documento \"%s\" renovado: nova validade %s (antes %s).".formatted(d.getNome(),
                        Datas.br(r.dataValidade()), validadeAnterior),
                REF, id);
        return resposta(d);
    }

    @Transactional
    public void excluir(Long id) {
        Documento d = buscarParaEscrita(id);
        List<DocumentoVersao> versoesDoDocumento = versoes.findByDocumentoIdOrderBySubstituidaEmDesc(id);
        String nome = d.getNome();
        servicoVinculo.removerDoRegistro(TipoRegistro.DOCUMENTO, id);
        documentos.delete(d);
        if (d.getArquivoId() != null) {
            servicoArquivo.excluir(d.getArquivoId());
        }
        versoesDoDocumento.stream().map(DocumentoVersao::getArquivoId).filter(Objects::nonNull)
                .forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.DOCUMENTOS, AcaoHistorico.EXCLUSAO,
                "Documento \"%s\" excluído.".formatted(nome), REF, id);
    }

    private Long validarArquivo(Long arquivoId) {
        if (arquivoId == null) {
            return null;
        }
        Arquivo arquivo = servicoArquivo.buscarParaVincular(arquivoId);
        if (arquivo.getCategoria() != CategoriaArquivo.DOCUMENTO) {
            throw new RegraNegocioExcecao("O arquivo enviado não é um documento.");
        }
        return arquivoId;
    }

    private DocumentoResposta resposta(Documento d) {
        List<DocumentoVersaoResposta> lista = versoes.findByDocumentoIdOrderBySubstituidaEmDesc(d.getId()).stream()
                .map(DocumentoVersaoResposta::de).toList();
        return DocumentoResposta.de(d, lista);
    }

    private Documento buscarParaLeitura(Long id) {
        Documento d = documentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        contexto.exigirLeitura(d.getUnidadeId());
        return d;
    }

    private Documento buscarParaEscrita(Long id) {
        Documento d = documentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        contexto.exigirEscrita(d.getUnidadeId());
        return d;
    }
}

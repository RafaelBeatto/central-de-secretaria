package br.org.apae.secretaria.gerador;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.gerador.dto.DocumentoGeradoItem;
import br.org.apae.secretaria.gerador.dto.DocumentoGeradoResposta;
import br.org.apae.secretaria.gerador.dto.RequisicaoDocumentoGerado;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.arquivo.ArquivoRepositorio;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;
import br.org.apae.secretaria.sistema.arquivo.ServicoArquivo;
import br.org.apae.secretaria.sistema.arquivo.dto.ArquivoResposta;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import lombok.RequiredArgsConstructor;

/**
 * Documentos gerados (old/js/17-gerador-documentos.js): criar a partir de um modelo com numeração por série/ano,
 * editar gerando nova versão, duplicar, anexos e exclusão. A montagem do texto final e o PDF são do front.
 */
@Service
@RequiredArgsConstructor
public class ServicoDocumentoGerado {

    private static final String REF = "DOCUMENTO_GERADO";

    private final DocumentoGeradoRepositorio documentos;
    private final DocumentoGeradoVersaoRepositorio versoes;
    private final ModeloDocumentoRepositorio modelos;
    private final ArquivoRepositorio arquivos;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoNumeracao numeracao;
    private final ServicoArquivo servicoArquivo;
    private final Relogio relogio;

    @Transactional(readOnly = true)
    public List<DocumentoGeradoItem> itens() {
        return documentos.findByUnidadeIdOrderByDataGeracaoDescIdDesc(contexto.unidadeLeitura()).stream()
                .map(DocumentoGeradoItem::de).toList();
    }

    @Transactional(readOnly = true)
    public DocumentoGeradoResposta detalhe(Long id) {
        return resposta(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        DocumentoGerado d = buscarParaLeitura(id);
        return historico.doRegistro(d.getUnidadeId(), REF, id);
    }

    @Transactional
    public DocumentoGeradoResposta criar(RequisicaoDocumentoGerado r) {
        Long unidadeId = contexto.unidadeEscrita();
        if (r.modeloId() == null) {
            throw new RegraNegocioExcecao("Escolha o modelo do documento.");
        }
        ModeloDocumento modelo = modelos.findById(r.modeloId()).orElseThrow(() -> new NaoEncontradoExcecao("Modelo"));
        if (!modelo.doSistema()) {
            contexto.exigirLeitura(modelo.getUnidadeId());
        }
        String numero = modelo.usaNumeracao()
                ? numeracao.numeroDoAno(modelo.serieEfetiva(), unidadeId, relogio.hoje().getYear())
                : null;
        DocumentoGerado d = new DocumentoGerado(unidadeId, modelo, numero, relogio.hoje(), contexto.usuario().id());
        preencher(d, r);
        documentos.save(d);
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.CRIACAO,
                "Documento \"%s\" gerado.".formatted(d.nomeExibido()), REF, d.getId());
        return resposta(d);
    }

    /** Editar não apaga: a versão atual é empilhada e as novas respostas viram a próxima versão. */
    @Transactional
    public DocumentoGeradoResposta atualizar(Long id, RequisicaoDocumentoGerado r) {
        DocumentoGerado d = buscarParaEscrita(id);
        Instant salvoEm = d.getAtualizadoEm();
        DocumentoGerado novo = rascunho(r);
        versoes.save(d.editar(novo.getValores(), novo.getContexto(), novo.getAssinaturas(), salvoEm));
        d.ligarA(r.vinculoTipo(), r.vinculoId(), rotulo(r));
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.EDICAO,
                "Documento \"%s\" salvo como versão %d.".formatted(d.nomeExibido(), d.getVersao()), REF, id);
        return resposta(d);
    }

    /** A cópia usa o texto e as respostas do próprio documento e recebe um número novo, se for numerado. */
    @Transactional
    public DocumentoGeradoResposta duplicar(Long id) {
        DocumentoGerado original = buscarParaEscrita(id);
        String numero = original.getNumero() == null ? null
                : numeracao.numeroDoAno(original.getSerie(), original.getUnidadeId(), relogio.hoje().getYear());
        DocumentoGerado copia = new DocumentoGerado(original.getUnidadeId(), original, numero, relogio.hoje(),
                contexto.usuario().id());
        documentos.save(copia);
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.CRIACAO,
                "Documento \"%s\" duplicado.".formatted(copia.nomeExibido()), REF, copia.getId());
        return resposta(copia);
    }

    @Transactional
    public void excluir(Long id) {
        DocumentoGerado d = buscarParaEscrita(id);
        String nome = d.nomeExibido();
        List<Long> anexos = List.copyOf(d.getAnexos());
        documentos.delete(d);
        anexos.forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.EXCLUSAO,
                "Documento \"%s\" excluído.".formatted(nome), REF, id);
    }

    @Transactional
    public DocumentoGeradoResposta anexar(Long id, Long arquivoId) {
        DocumentoGerado d = buscarParaEscrita(id);
        servicoArquivo.exigirCategoria(arquivoId, CategoriaArquivo.ANEXO_GERADOR);
        d.anexar(arquivoId);
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.DOCUMENTO,
                "Anexo adicionado ao documento \"%s\".".formatted(d.nomeExibido()), REF, id);
        return resposta(d);
    }

    @Transactional
    public DocumentoGeradoResposta removerAnexo(Long id, Long arquivoId) {
        DocumentoGerado d = buscarParaEscrita(id);
        if (!d.removerAnexo(arquivoId)) {
            throw new NaoEncontradoExcecao("Anexo");
        }
        servicoArquivo.excluir(arquivoId);
        historico.registrar(ModuloHistorico.GERADOR, AcaoHistorico.EXCLUSAO,
                "Anexo removido do documento \"%s\".".formatted(d.nomeExibido()), REF, id);
        return resposta(d);
    }

    /** O antigo não deixava excluir empresa ligada a documento gerado. */
    @Transactional(readOnly = true)
    public boolean existeLigadoA(Long unidadeId, TipoVinculo tipo, Long registroId) {
        return documentos.existsByUnidadeIdAndVinculoTipoAndVinculoId(unidadeId, tipo, registroId);
    }

    private void preencher(DocumentoGerado d, RequisicaoDocumentoGerado r) {
        DocumentoGerado novo = rascunho(r);
        d.preencher(novo.getValores(), novo.getContexto(), novo.getAssinaturas());
        d.ligarA(r.vinculoTipo(), r.vinculoId(), rotulo(r));
    }

    /** Respostas já normalizadas (campos vazios e linhas de assinatura em branco saem). */
    private DocumentoGerado rascunho(RequisicaoDocumentoGerado r) {
        if ((r.vinculoTipo() == null) != (r.vinculoId() == null)) {
            throw new RegraNegocioExcecao("Informe o tipo e o registro do vínculo, ou nenhum dos dois.");
        }
        DocumentoGerado rascunho = new DocumentoGerado();
        rascunho.preencher(r.valores(), r.contexto(),
                r.assinaturas().stream()
                        .map(linhas -> linhas.stream().map(Textos::limpo).filter(java.util.Objects::nonNull).toList())
                        .filter(linhas -> !linhas.isEmpty()).toList());
        return rascunho;
    }

    private static String rotulo(RequisicaoDocumentoGerado r) {
        return r.vinculoTipo() == null ? null : Textos.limpo(r.vinculoRotulo());
    }

    private DocumentoGeradoResposta resposta(DocumentoGerado d) {
        List<ArquivoResposta> anexos = arquivos.findAllById(d.getAnexos()).stream().map(ArquivoResposta::de).toList();
        return DocumentoGeradoResposta.de(d, anexos,
                versoes.findByDocumentoGeradoIdOrderByVersaoDesc(d.getId()));
    }

    private DocumentoGerado buscarParaLeitura(Long id) {
        DocumentoGerado d = documentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        contexto.exigirLeitura(d.getUnidadeId());
        return d;
    }

    private DocumentoGerado buscarParaEscrita(Long id) {
        DocumentoGerado d = documentos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Documento"));
        contexto.exigirEscrita(d.getUnidadeId());
        return d;
    }
}

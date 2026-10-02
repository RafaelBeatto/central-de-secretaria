package br.org.apae.secretaria.gerador;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.Textos;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.gerador.dto.ModeloResposta;
import br.org.apae.secretaria.gerador.dto.RequisicaoModelo;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.numeracao.ServicoNumeracao;
import lombok.RequiredArgsConstructor;

/** Modelos de documento: os do sistema (somente leitura/duplicar) e os da unidade (old/js/17: CRUD de modelos). */
@Service
@RequiredArgsConstructor
public class ServicoModeloDocumento {

    private static final String SUFIXO_COPIA = " (cópia)";

    private final ModeloDocumentoRepositorio modelos;
    private final DocumentoGeradoRepositorio documentos;
    private final ContextoSeguranca contexto;
    private final SanitizadorHtml sanitizador;
    private final ServicoNumeracao numeracao;
    private final Relogio relogio;

    @Transactional(readOnly = true)
    public List<ModeloResposta> itens() {
        Long unidadeId = contexto.unidadeLeitura();
        Map<Long, Long> usos = new HashMap<>();
        documentos.usosPorModelo(unidadeId).forEach(l -> usos.put((Long) l[0], (Long) l[1]));
        int ano = relogio.hoje().getYear();
        return modelos.findByUnidadeIdIsNullOrUnidadeIdOrderByNomeAsc(unidadeId).stream()
                .map(m -> ModeloResposta.de(m, usos.getOrDefault(m.getId(), 0L),
                        m.usaNumeracao() ? numeracao.espiarNumeroDoAno(m.serieEfetiva(), unidadeId, ano) : null))
                .toList();
    }

    @Transactional
    public ModeloResposta criar(RequisicaoModelo r) {
        Long unidadeId = contexto.unidadeEscrita();
        ModeloDocumento m = new ModeloDocumento(unidadeId, Textos.limpo(r.nome()), Textos.limpo(r.titulo()),
                Textos.limpo(r.serie()), htmlValido(r.texto()), FormatoModelo.HTML, Textos.limpo(r.espacamento()));
        modelos.save(m);
        return resposta(m, unidadeId);
    }

    @Transactional
    public ModeloResposta atualizar(Long id, RequisicaoModelo r) {
        ModeloDocumento m = buscarParaEscrita(id);
        // Um modelo em texto puro vira HTML ao ser editado no editor (os documentos já gerados não mudam).
        m.alterar(Textos.limpo(r.nome()), Textos.limpo(r.titulo()), Textos.limpo(r.serie()), htmlValido(r.texto()),
                Textos.limpo(r.espacamento()));
        return resposta(m, m.getUnidadeId());
    }

    @Transactional
    public ModeloResposta duplicar(Long id) {
        Long unidadeId = contexto.unidadeEscrita();
        ModeloDocumento original = modelos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Modelo"));
        if (!original.doSistema()) {
            contexto.exigirLeitura(original.getUnidadeId());
        }
        String nome = original.getNome();
        int maximo = Limites.GERADOR_MODELO_NOME - SUFIXO_COPIA.length();
        ModeloDocumento copia = new ModeloDocumento(unidadeId,
                (nome.length() > maximo ? nome.substring(0, maximo) : nome) + SUFIXO_COPIA, original.getTitulo(),
                original.getSerie(), original.getTexto(), original.getFormato(), original.getEspacamento());
        modelos.save(copia);
        return resposta(copia, unidadeId);
    }

    @Transactional
    public void excluir(Long id) {
        // Os documentos já gerados guardam a própria cópia do texto: continuam intactos (modelo_id vira nulo).
        modelos.delete(buscarParaEscrita(id));
    }

    private ModeloResposta resposta(ModeloDocumento m, Long unidadeId) {
        long usos = documentos.usosPorModelo(unidadeId).stream().filter(l -> m.getId().equals(l[0]))
                .mapToLong(l -> (Long) l[1]).sum();
        return ModeloResposta.de(m, usos,
                m.usaNumeracao() ? numeracao.espiarNumeroDoAno(m.serieEfetiva(), unidadeId, relogio.hoje().getYear())
                        : null);
    }

    private String htmlValido(String texto) {
        String limpo = sanitizador.limpar(texto);
        if (!sanitizador.temConteudo(limpo)) {
            throw new RegraNegocioExcecao("Escreva o texto do documento.");
        }
        return limpo;
    }

    private ModeloDocumento buscarParaEscrita(Long id) {
        ModeloDocumento m = modelos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Modelo"));
        if (m.doSistema()) {
            throw new RegraNegocioExcecao(
                    "Os modelos do sistema não podem ser alterados nem excluídos. Duplique o modelo para criar o seu.");
        }
        contexto.exigirEscrita(m.getUnidadeId());
        return m;
    }
}

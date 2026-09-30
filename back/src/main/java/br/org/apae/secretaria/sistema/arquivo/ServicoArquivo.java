package br.org.apae.secretaria.sistema.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.Transacoes;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.configuracao.PropriedadesAplicacao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.sistema.arquivo.dto.ArquivoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Único caminho para guardar, abrir e apagar arquivos. Todos os módulos
 * (documentos, projetos, gerador, logo da unidade…) reaproveitam este serviço.
 */
@Service
@RequiredArgsConstructor
public class ServicoArquivo {

    private final ArquivoRepositorio repositorio;
    private final ArmazenamentoS3 armazenamento;
    private final ContextoSeguranca contexto;
    private final PropriedadesAplicacao propriedades;

    @Transactional
    public ArquivoResposta enviar(MultipartFile arquivo, CategoriaArquivo categoria) {
        String nome = nomeSeguro(arquivo.getOriginalFilename());
        String extensao = extensao(nome);
        if (arquivo.isEmpty()) {
            throw new RegraNegocioExcecao("O arquivo está vazio.");
        }
        if (arquivo.getSize() > propriedades.armazenamento().tamanhoMaximoBytes()) {
            throw new RegraNegocioExcecao("O arquivo passa de %d MB.".formatted(propriedades.armazenamento().tamanhoMaximoMb()));
        }
        if (!categoria.aceita(extensao)) {
            throw new RegraNegocioExcecao("Formato não aceito aqui. Use: " + String.join(", ", categoria.extensoes()) + ".");
        }
        Long unidadeId = contexto.unidadeEscrita();
        String chave = "unidades/%d/%s/%s.%s".formatted(unidadeId, categoria.name().toLowerCase(Locale.ROOT),
                UUID.randomUUID(), extensao);
        String tipo = StringUtils.hasText(arquivo.getContentType()) ? arquivo.getContentType() : "application/octet-stream";
        try (InputStream conteudo = arquivo.getInputStream()) {
            armazenamento.enviar(chave, conteudo, arquivo.getSize(), tipo);
        } catch (IOException e) {
            throw new RegraNegocioExcecao("Não foi possível ler o arquivo enviado.");
        }
        // Se a transação falhar depois do envio, o objeto não pode ficar órfão no bucket.
        Transacoes.aoDesfazer(() -> armazenamento.excluir(chave));
        Arquivo salvo = repositorio.save(new Arquivo(unidadeId, chave, nome, tipo, arquivo.getSize(), categoria,
                contexto.usuario().id()));
        return ArquivoResposta.de(salvo);
    }

    @Transactional(readOnly = true)
    public String urlTemporaria(Long arquivoId) {
        Arquivo arquivo = buscarVisivel(arquivoId);
        return armazenamento.urlTemporaria(arquivo.getChaveS3(), arquivo.getNomeOriginal());
    }

    /** Referência validada para ligar a um registro: o arquivo precisa ser da unidade do usuário. */
    @Transactional(readOnly = true)
    public Arquivo buscarParaVincular(Long arquivoId) {
        Arquivo arquivo = repositorio.findById(arquivoId).orElseThrow(() -> new NaoEncontradoExcecao("Arquivo"));
        contexto.exigirEscrita(arquivo.getUnidadeId());
        return arquivo;
    }

    /** Remove o registro e, só depois do commit, o objeto no S3. */
    @Transactional
    public void excluir(Long arquivoId) {
        repositorio.findById(arquivoId).ifPresent(arquivo -> {
            contexto.exigirEscrita(arquivo.getUnidadeId());
            repositorio.delete(arquivo);
            Transacoes.aposConfirmar(() -> armazenamento.excluir(arquivo.getChaveS3()));
        });
    }

    @Transactional(readOnly = true)
    public ArquivoResposta dados(Long arquivoId) {
        return ArquivoResposta.de(buscarVisivel(arquivoId));
    }

    private Arquivo buscarVisivel(Long arquivoId) {
        Arquivo arquivo = repositorio.findById(arquivoId).orElseThrow(() -> new NaoEncontradoExcecao("Arquivo"));
        contexto.exigirLeitura(arquivo.getUnidadeId());
        return arquivo;
    }

    private static String nomeSeguro(String original) {
        String nome = StringUtils.getFilename(StringUtils.hasText(original) ? original : "arquivo");
        nome = nome.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", " ").trim();
        if (nome.isEmpty()) {
            nome = "arquivo";
        }
        return nome.length() > Limites.ARQUIVO_NOME ? nome.substring(nome.length() - Limites.ARQUIVO_NOME) : nome;
    }

    private static String extensao(String nome) {
        String extensao = StringUtils.getFilenameExtension(nome);
        return extensao == null ? "" : extensao.toLowerCase(Locale.ROOT);
    }

}

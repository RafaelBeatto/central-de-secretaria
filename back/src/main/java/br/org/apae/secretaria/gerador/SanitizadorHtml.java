package br.org.apae.secretaria.gerador;

import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Limpa o HTML do editor de modelos (old: sanitizarHTMLDocumento): sem script, iframe, formulários,
 * manipuladores on*, javascript: nem imagens de fora; mantém a formatação (negrito, listas, tabelas,
 * alinhamento, tamanhos) e a quebra de página.
 */
@Component
public class SanitizadorHtml {

    private static final Pattern ESTILO_PERIGOSO = Pattern
            .compile("url\\s*\\(|expression|@import|behavior|position\\s*:", Pattern.CASE_INSENSITIVE);

    private static final Safelist PERMITIDO = Safelist.relaxed()
            .addTags("font", "hr")
            .addAttributes(":all", "style", "class")
            .addAttributes("font", "size")
            .addAttributes("td", "colspan", "rowspan")
            .addAttributes("th", "colspan", "rowspan")
            .removeTags("img");

    public String limpar(String html) {
        Document.OutputSettings saida = new Document.OutputSettings().prettyPrint(false);
        String limpo = Jsoup.clean(html == null ? "" : html, "", PERMITIDO, saida);
        Document doc = Jsoup.parseBodyFragment(limpo);
        doc.outputSettings(saida);
        for (Element el : doc.body().select("[style]")) {
            if (ESTILO_PERIGOSO.matcher(el.attr("style")).find()) {
                el.removeAttr("style");
            }
        }
        return doc.body().html();
    }

    /** Um documento pode ser só uma tabela, sem texto corrido: conta como conteúdo. */
    public boolean temConteudo(String htmlLimpo) {
        Document doc = Jsoup.parseBodyFragment(htmlLimpo);
        return !doc.body().text().isBlank() || !doc.body().select("table").isEmpty();
    }
}

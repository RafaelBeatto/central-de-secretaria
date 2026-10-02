package br.org.apae.secretaria.agenda.fontes;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.dto.ItemAgenda.OrigemItemAgenda;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.documentos.Documento;
import br.org.apae.secretaria.documentos.DocumentoRepositorio;
import lombok.RequiredArgsConstructor;

/** Vencimento dos documentos com validade, com prioridade pela proximidade (old/js/05-agenda.js). */
@Component
@RequiredArgsConstructor
public class FonteDocumentos implements FonteAgenda {

    private final DocumentoRepositorio repositorio;

    @Override
    public String permissao() {
        return "DOCUMENTO_LER";
    }

    @Override
    public List<ItemAgenda> itens(Long unidadeId, LocalDate inicio, LocalDate fim, LocalDate hoje) {
        return repositorio.findByUnidadeIdAndDataValidadeBetween(unidadeId, inicio, fim).stream()
                .map(d -> item(d, hoje)).toList();
    }

    private static ItemAgenda item(Documento d, LocalDate hoje) {
        return new ItemAgenda("DOCUMENTO-" + d.getId(), OrigemItemAgenda.DOCUMENTO, d.getId(),
                "Vencimento: " + d.getNome(), null, Prioridade.pelaProximidade(d.getDataValidade(), hoje, Prioridade.MEDIA),
                d.getDataValidade(), null, null, null, d.getResponsavel(), null, d.getDescricao(), false, null, false);
    }
}

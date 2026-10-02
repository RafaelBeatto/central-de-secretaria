package br.org.apae.secretaria.agenda.fontes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.dto.ItemAgenda.OrigemItemAgenda;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.projetos.ExecucaoRepositorio;
import br.org.apae.secretaria.projetos.RecursoRepositorio;
import lombok.RequiredArgsConstructor;

/**
 * Início e fim de recursos não arquivados e das execuções deles (old/js/05-agenda.js). O fim tem
 * prioridade pela proximidade. Chaves: RECURSO_INICIO-id, RECURSO_FIM-id, EXECUCAO_INICIO-id, EXECUCAO_FIM-id.
 */
@Component
@RequiredArgsConstructor
public class FonteProjetos implements FonteAgenda {

    private final RecursoRepositorio recursos;
    private final ExecucaoRepositorio execucoes;

    @Override
    public String permissao() {
        return "PROJETO_LER";
    }

    @Override
    public List<ItemAgenda> itens(Long unidadeId, LocalDate inicio, LocalDate fim, LocalDate hoje) {
        List<ItemAgenda> itens = new ArrayList<>();
        recursos.ativosComDataNoPeriodo(unidadeId, inicio, fim).forEach(r -> adicionar(itens, "RECURSO", r.getId(),
                r.getNome(), r.getResponsavel(), r.getFinalidade(), r.getDataInicio(), r.getDataFim(), inicio, fim, hoje));
        execucoes.deRecursosAtivosComDataNoPeriodo(unidadeId, inicio, fim).forEach(e -> adicionar(itens, "EXECUCAO",
                e.getId(), e.getNome(), e.getResponsavel(), e.getObjetivo(), e.getDataInicio(), e.getDataFim(), inicio, fim, hoje));
        return itens;
    }

    private static void adicionar(List<ItemAgenda> itens, String tipo, Long id, String nome, String responsavel,
            String descricao, LocalDate dataInicio, LocalDate dataFim, LocalDate inicio, LocalDate fim, LocalDate hoje) {
        if (!dataInicio.isBefore(inicio) && !dataInicio.isAfter(fim)) {
            itens.add(item(tipo + "_INICIO-" + id, id, "Início: " + nome, Prioridade.MEDIA, dataInicio, responsavel, descricao));
        }
        if (!dataFim.isBefore(inicio) && !dataFim.isAfter(fim)) {
            itens.add(item(tipo + "_FIM-" + id, id, "Fim: " + nome, Prioridade.pelaProximidade(dataFim, hoje, Prioridade.MEDIA),
                    dataFim, responsavel, descricao));
        }
    }

    private static ItemAgenda item(String chave, Long id, String titulo, Prioridade prioridade, LocalDate data,
            String responsavel, String descricao) {
        return new ItemAgenda(chave, OrigemItemAgenda.PROJETO, id, titulo, null, prioridade, data, null, null, null,
                responsavel, null, descricao, false, null, false);
    }
}

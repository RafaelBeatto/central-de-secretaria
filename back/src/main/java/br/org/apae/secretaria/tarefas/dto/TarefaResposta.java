package br.org.apae.secretaria.tarefas.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.tarefas.StatusTarefa;
import br.org.apae.secretaria.tarefas.Tarefa;

/**
 * Tarefa pronta para a tela. Os campos calculados (recorrente, prazoEfetivo,
 * feitaHoje) usam o "hoje" do fuso de quem pediu.
 */
public record TarefaResposta(
        Long id, String codigo, String titulo, String descricao, String responsavel, String categoria,
        Prioridade prioridade, StatusTarefa status, LocalDate prazo, LocalTime horario, LocalDate dataConclusao,
        Frequencia frequencia, Short diaSemana, Short diaMes, LocalDate proxima, LocalDate ultimaOcorrencia,
        LocalDate ultimaConclusao, boolean recorrente, LocalDate prazoEfetivo, boolean feitaHoje,
        List<SubtarefaResposta> subtarefas, Instant criadoEm, Instant atualizadoEm) {

    public record SubtarefaResposta(Long id, String texto, boolean feita) {
    }

    public static TarefaResposta de(Tarefa t, LocalDate hoje) {
        return new TarefaResposta(t.getId(), t.getCodigo(), t.getTitulo(), t.getDescricao(), t.getResponsavel(),
                t.getCategoria(), t.getPrioridade(), t.getStatus(), t.getPrazo(), t.getHorario(), t.getDataConclusao(),
                t.getFrequencia(), t.getDiaSemana(), t.getDiaMes(), t.getProxima(), t.getUltimaOcorrencia(),
                t.getUltimaConclusao(), t.recorrente(), t.prazoEfetivo(), t.feitaEm(hoje),
                t.getSubtarefas().stream().map(s -> new SubtarefaResposta(s.getId(), s.getTexto(), s.isFeita())).toList(),
                t.getCriadoEm(), t.getAtualizadoEm());
    }
}

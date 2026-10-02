package br.org.apae.secretaria.painel.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import br.org.apae.secretaria.atendimentos.MotivoFalta;
import br.org.apae.secretaria.comum.dominio.Prioridade;

/**
 * O que as Pendências e o Painel precisam e nenhuma outra tela já entrega pronto.
 * Cada lista vem vazia quando o usuário não tem a permissão do módulo de origem.
 */
public record ExtrasPainel(
        List<AtendimentoSemPresenca> atendimentosSemPresenca,
        List<AlunoComFaltas> alunosComFaltas,
        List<PendenciaExecucao> pendenciasExecucao) {

    public record AtendimentoSemPresenca(Long id, String alunoNome, String profissionalNome, LocalDate data,
            LocalTime horario) {
    }

    public record AlunoComFaltas(Long alunoId, String alunoNome, int quantidade, LocalDate desde, LocalDate ultima,
            List<MotivoFalta> motivos) {
    }

    public record PendenciaExecucao(Long id, Long execucaoId, String titulo, Prioridade prioridade) {
    }
}

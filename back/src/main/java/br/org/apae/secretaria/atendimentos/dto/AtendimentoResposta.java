package br.org.apae.secretaria.atendimentos.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import br.org.apae.secretaria.atendimentos.Atendimento;
import br.org.apae.secretaria.atendimentos.MotivoFalta;
import br.org.apae.secretaria.atendimentos.Presenca;

/**
 * Atendimento para a lista e o painel. Remarcado traz para onde foi (a cópia);
 * nascido de uma remarcação traz de onde veio (o original).
 */
public record AtendimentoResposta(
        Long id, Long alunoId, String alunoNome, Long profissionalId, String profissionalNome, LocalDate data,
        LocalTime horario, String observacao, Presenca presenca, MotivoFalta faltaMotivo, String faltaObservacao,
        boolean remarcado, String remarcadoMotivo, Long remarcadoDeId, LocalDate remarcadoDeData,
        LocalTime remarcadoDeHorario, Long remarcadoParaId, LocalDate remarcadoParaData, LocalTime remarcadoParaHorario,
        String remarcadoParaProfissionalNome, UUID serieId, int restantesNaSerie, Instant criadoEm,
        Instant atualizadoEm) {

    /** "copia" = o atendimento nascido desta remarcação (null se este não foi remarcado). */
    public static AtendimentoResposta de(Atendimento a, Atendimento copia, int restantesNaSerie) {
        Atendimento origem = a.getRemarcadoDe();
        return new AtendimentoResposta(a.getId(), a.getAluno().getId(), a.getAluno().getNome(),
                a.getProfissional().getId(), a.getProfissional().getNome(), a.getData(), a.getHorario(),
                a.getObservacao(), a.getPresenca(), a.getFaltaMotivo(), a.getFaltaObservacao(), a.isRemarcado(),
                a.getRemarcadoMotivo(), origem == null ? null : origem.getId(), origem == null ? null : origem.getData(),
                origem == null ? null : origem.getHorario(), copia == null ? null : copia.getId(),
                copia == null ? null : copia.getData(), copia == null ? null : copia.getHorario(),
                copia == null ? null : copia.getProfissional().getNome(), a.getSerieId(), restantesNaSerie,
                a.getCriadoEm(), a.getAtualizadoEm());
    }
}

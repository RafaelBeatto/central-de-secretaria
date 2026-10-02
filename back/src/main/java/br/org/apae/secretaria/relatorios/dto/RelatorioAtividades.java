package br.org.apae.secretaria.relatorios.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Relatório de atividades do período; cada seção vem nula se não foi pedida ou o usuário não pode ler o módulo. */
public record RelatorioAtividades(LocalDate de, LocalDate ate, Secretaria secretaria, Agenda agenda,
        Atendimentos atendimentos, Documentos documentos, Projetos projetos) {

    public record Secretaria(int criadas, int abertas, List<TarefaConcluida> concluidas, List<TarefaAtrasada> atrasadas) {
    }

    public record TarefaConcluida(LocalDate dia, String titulo, String responsavel) {
    }

    public record TarefaAtrasada(LocalDate prazo, String titulo, String responsavel) {
    }

    public record Agenda(int realizados, List<Compromisso> compromissos) {
    }

    public record Compromisso(LocalDate data, LocalTime horario, String titulo, String tipo, String local,
            boolean realizado) {
    }

    public record Atendimentos(int total, int alunos, int veio, int faltou, int semRegistro, Integer taxa,
            List<PorProfissional> profissionais, List<Motivo> motivos) {
    }

    public record PorProfissional(String nome, int alunos, int atendimentos, int veio, int faltou) {
    }

    public record Motivo(String rotulo, int quantidade) {
    }

    public record Documentos(int total, int cadastrados, List<Renovado> renovados, List<Situacao> situacao) {
    }

    public record Renovado(LocalDate dia, String nome, LocalDate validade) {
    }

    /** Documento vencido (dias negativos) ou que vence em até 30 dias. */
    public record Situacao(String nome, LocalDate validade, long dias) {
    }

    public record Projetos(List<RecursoFinanceiro> recursos, List<Pagamento> pagamentos, BigDecimal totalPago) {
    }

    public record RecursoFinanceiro(String nome, BigDecimal recebido, BigDecimal pago, BigDecimal disponivel) {
    }

    public record Pagamento(LocalDate data, String execucao, String recurso, String fornecedor, BigDecimal valor) {
    }
}

package br.org.apae.secretaria.projetos;

/** Situações e tipos do módulo de projetos (old/js/04-projetos.js), gravados em MAIÚSCULAS. */
public final class Enums {

    private Enums() {
    }

    public enum StatusRecurso {
        AGUARDANDO_EXECUCAO("Aguardando execução"), EM_EXECUCAO("Em execução"),
        PARCIALMENTE_DISTRIBUIDO("Parcialmente distribuído"), COM_PENDENCIAS("Com pendências"), ENCERRADO("Encerrado");

        private final String rotulo;

        StatusRecurso(String rotulo) {
            this.rotulo = rotulo;
        }

        public String rotulo() {
            return rotulo;
        }
    }

    public enum StatusExecucao {
        PLANEJAMENTO("Planejamento"), EM_EXECUCAO("Em execução"), CONCLUIDO("Concluído"), SUSPENSO("Suspenso"),
        CANCELADO("Cancelado");

        private final String rotulo;

        StatusExecucao(String rotulo) {
            this.rotulo = rotulo;
        }

        public String rotulo() {
            return rotulo;
        }
    }

    /** Histórico financeiro do recurso: nunca alterado, só acrescentado. */
    public enum TipoMovimentacao {
        ENTRADA, DISTRIBUICAO, PAGAMENTO, TRANSFERENCIA, AJUSTE
    }

    public enum StatusOrdemCompra {
        RASCUNHO, EMITIDA, RECEBIDA, CANCELADA
    }

    /** Nota fiscal conclui a etapa "Nota fiscal / comprovante" do checklist. */
    public enum CategoriaDocumentoExecucao {
        NOTA_FISCAL, COMPROVANTE, RELATORIO, DECLARACAO, OUTRO
    }
}

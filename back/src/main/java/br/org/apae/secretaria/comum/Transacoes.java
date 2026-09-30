package br.org.apae.secretaria.comum;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Ações ligadas ao resultado da transação atual (enviar evento só se gravou,
 * limpar objeto no S3 só se desfez…). Falhas nessas ações são registradas e
 * não afetam a operação principal, que já terminou.
 */
public final class Transacoes {

    private static final Logger log = LoggerFactory.getLogger(Transacoes.class);

    private Transacoes() {
    }

    public static void aposConfirmar(Runnable acao) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                executarSemPropagar(acao);
            }
        });
    }

    public static void aoDesfazer(Runnable acao) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    executarSemPropagar(acao);
                }
            }
        });
    }

    private static void executarSemPropagar(Runnable acao) {
        try {
            acao.run();
        } catch (RuntimeException e) {
            log.warn("Falha em ação pós-transação: {}", e.getMessage(), e);
        }
    }
}

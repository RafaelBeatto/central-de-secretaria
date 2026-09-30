package br.org.apae.secretaria.sistema.numeracao;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Sequências por unidade, sem corrida entre usuários simultâneos (upsert atômico).
 * - Códigos de registro: {@code codigo("TAR", unidade)} → "TAR-0001".
 * - Numeração do Gerador: {@code numeroDoAno("Ofício", unidade, 2026)} → "001/2026".
 */
@Service
@RequiredArgsConstructor
public class ServicoNumeracao {

    private static final short SEM_ANO = 0;

    private final JdbcClient jdbc;

    @Transactional(propagation = Propagation.MANDATORY)
    public String codigo(String prefixo, Long unidadeId) {
        return "%s-%04d".formatted(prefixo, proximo(unidadeId, prefixo, SEM_ANO));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String numeroDoAno(String serie, Long unidadeId, int ano) {
        return "%03d/%d".formatted(proximo(unidadeId, serie, (short) ano), ano);
    }

    /** Próximo número sem consumir (prévia no formulário do Gerador). */
    @Transactional(readOnly = true)
    public String espiarNumeroDoAno(String serie, Long unidadeId, int ano) {
        int atual = jdbc.sql("""
                select coalesce(max(ultimo_numero), 0) from sistema.numeracao
                 where unidade_id = :unidade and serie = :serie and ano = :ano
                """)
                .param("unidade", unidadeId).param("serie", serie).param("ano", (short) ano)
                .query(Integer.class).single();
        return "%03d/%d".formatted(atual + 1, ano);
    }

    private int proximo(Long unidadeId, String serie, short ano) {
        return jdbc.sql("""
                insert into sistema.numeracao (unidade_id, serie, ano, ultimo_numero)
                values (:unidade, :serie, :ano, 1)
                on conflict (unidade_id, serie, ano)
                do update set ultimo_numero = sistema.numeracao.ultimo_numero + 1
                returning ultimo_numero
                """)
                .param("unidade", unidadeId).param("serie", serie).param("ano", ano)
                .query(Integer.class).single();
    }
}

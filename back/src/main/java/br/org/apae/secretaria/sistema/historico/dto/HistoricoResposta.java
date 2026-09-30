package br.org.apae.secretaria.sistema.historico.dto;

import java.time.Instant;

import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;

/** Linha do histórico exibida ao usuário (quem fez fica pelo nome). */
public record HistoricoResposta(Long id, ModuloHistorico modulo, AcaoHistorico acao, String descricao, String refTipo,
        Long refId, String usuarioNome, Instant criadoEm) {
}

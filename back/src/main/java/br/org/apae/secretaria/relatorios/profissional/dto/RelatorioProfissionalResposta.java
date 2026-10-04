package br.org.apae.secretaria.relatorios.profissional.dto;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.relatorios.profissional.RelatorioProfissional;
import br.org.apae.secretaria.relatorios.profissional.StatusRelatorio;
import br.org.apae.secretaria.relatorios.profissional.TipoRelatorio;

/** O id do arquivo não sai daqui: o PDF só abre por {@code GET /api/relatorios-profissionais/{id}/url}. */
public record RelatorioProfissionalResposta(
        Long id,
        Long usuarioId,
        String nomeUsuario,
        String cargoNome,
        String nome,
        TipoRelatorio tipo,
        String nomeAluno,
        String complemento,
        LocalDate periodoInicio,
        LocalDate periodoFim,
        String nomeArquivo,
        Long tamanhoBytes,
        StatusRelatorio status,
        Instant solicitadoEm,
        Instant enviadoEm) {

    public static RelatorioProfissionalResposta de(RelatorioProfissional r, String nomeArquivo, Long tamanhoBytes) {
        return new RelatorioProfissionalResposta(r.getId(), r.getUsuarioId(), r.getNomeUsuario(), r.getCargoNome(),
                r.getNome(), r.getTipo(), r.getNomeAluno(), r.getComplemento(),
                r.getPeriodoInicio(), r.getPeriodoFim(), nomeArquivo, tamanhoBytes, r.getStatus(),
                r.getSolicitadoEm(), r.getEnviadoEm());
    }
}

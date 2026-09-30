package br.org.apae.secretaria.tarefas.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.tarefas.StatusTarefa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Criação rápida: barra "O que precisa ser feito?" da Secretaria (com prazo)
 * ou rodapé de uma coluna do Kanban (com a situação da coluna, sem prazo).
 */
public record RequisicaoTarefaRapida(
        @NotBlank @Size(max = Limites.TAREFA_TITULO) String titulo,
        LocalDate prazo,
        StatusTarefa status,
        @Size(max = Limites.RESPONSAVEL) String responsavel) {
}

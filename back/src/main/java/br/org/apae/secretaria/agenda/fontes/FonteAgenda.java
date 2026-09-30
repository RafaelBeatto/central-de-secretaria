package br.org.apae.secretaria.agenda.fontes;

import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.agenda.dto.ItemAgenda;

/**
 * Um módulo que põe datas na agenda. A agenda junta todas as fontes cuja permissão
 * o usuário tem (professor e profissional veem a agenda, mas não as tarefas).
 * Documentos e projetos entram como novas fontes nos módulos deles; a dependência
 * fica numa direção só: agenda → outros módulos.
 */
public interface FonteAgenda {

    /** Código da permissão de leitura (ex.: "TAREFA_LER"). */
    String permissao();

    List<ItemAgenda> itens(Long unidadeId, LocalDate inicio, LocalDate fim, LocalDate hoje);
}

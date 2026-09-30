package br.org.apae.secretaria.agenda;

import java.text.Collator;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.agenda.dto.ItemAgenda;
import br.org.apae.secretaria.agenda.fontes.FonteAgenda;
import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

/**
 * Tudo que tem data num período, vindo de todas as fontes que o usuário pode ver.
 * Também servirá ao Painel e às Pendências.
 */
@Service
@RequiredArgsConstructor
public class ServicoAgenda {

    /** A visão Mês mostra até 42 dias e a Lista 30: 100 dias sobra. */
    private static final int MAXIMO_DIAS = 100;
    private static final Collator COLLATOR = Collator.getInstance(Locale.of("pt", "BR"));
    /** Mesma ordem do antigo: dia, horário (dia todo primeiro) e título. */
    private static final Comparator<ItemAgenda> ORDEM = Comparator.comparing(ItemAgenda::data)
            .thenComparing(ItemAgenda::horarioInicio, Comparator.nullsFirst(Comparator.<LocalTime>naturalOrder()))
            .thenComparing(ItemAgenda::titulo, COLLATOR);

    private final List<FonteAgenda> fontes;
    private final ContextoSeguranca contexto;
    private final Relogio relogio;

    @Transactional(readOnly = true)
    public List<ItemAgenda> itens(LocalDate inicio, LocalDate fim) {
        if (fim.isBefore(inicio)) {
            throw new RegraNegocioExcecao("A data final não pode ser antes da inicial.");
        }
        if (ChronoUnit.DAYS.between(inicio, fim) > MAXIMO_DIAS) {
            throw new RegraNegocioExcecao("Escolha um período de até %d dias.".formatted(MAXIMO_DIAS));
        }
        Long unidadeId = contexto.unidadeLeitura();
        UsuarioAutenticado usuario = contexto.usuario();
        LocalDate hoje = relogio.hoje();
        return fontes.stream()
                .filter(fonte -> usuario.possui(fonte.permissao()))
                .flatMap(fonte -> fonte.itens(unidadeId, inicio, fim, hoje).stream())
                .sorted(ORDEM)
                .toList();
    }
}

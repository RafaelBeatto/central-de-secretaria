package br.org.apae.secretaria.comum;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import br.org.apae.secretaria.configuracao.PropriedadesAplicacao;

/**
 * "Hoje" de quem está usando o sistema. As APAEs ficam em fusos diferentes
 * (ex.: Rondônia UTC-4, Brasília UTC-3), então vale o fuso que o navegador
 * informa no cabeçalho {@value #CABECALHO_FUSO}; sem ele, o padrão da configuração.
 */
@Component
public class Relogio {

    public static final String CABECALHO_FUSO = "X-Fuso-Horario";

    private final ZoneId fusoPadrao;

    public Relogio(PropriedadesAplicacao propriedades) {
        this.fusoPadrao = ZoneId.of(propriedades.fusoHorarioPadrao());
    }

    public LocalDate hoje() {
        return LocalDate.now(fuso());
    }

    public ZoneId fuso() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            String informado = atributos.getRequest().getHeader(CABECALHO_FUSO);
            if (StringUtils.hasText(informado)) {
                try {
                    return ZoneId.of(informado.trim());
                } catch (DateTimeException ignorado) {
                    // Fuso desconhecido: usa o padrão.
                }
            }
        }
        return fusoPadrao;
    }
}

package br.org.apae.secretaria.agenda;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Série de um evento que se repete. Cada data da série é um {@link Evento}
 * próprio (pode ser concluído, movido ou editado sozinho), como no antigo.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "evento_serie", schema = "agenda")
public class EventoSerie extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private Frequencia frequencia;

    @Column(name = "repetir_ate", nullable = false, updatable = false)
    private LocalDate repetirAte;

    public EventoSerie(Long unidadeId, Frequencia frequencia, LocalDate repetirAte) {
        this.unidadeId = unidadeId;
        this.frequencia = frequencia;
        this.repetirAte = repetirAte;
    }
}

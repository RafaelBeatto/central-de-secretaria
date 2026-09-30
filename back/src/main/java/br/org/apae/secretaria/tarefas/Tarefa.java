package br.org.apae.secretaria.tarefas;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import br.org.apae.secretaria.comum.Datas;
import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Frequencia;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.comum.dominio.Recorrencia;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tarefa da Secretaria. Com frequência preenchida é uma rotina: nunca fica
 * "Concluída" — cada vez que é feita, a próxima ocorrência avança.
 * As regras são as mesmas do sistema antigo (old/js/05a-secretaria.js).
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tarefa", schema = "secretaria")
public class Tarefa extends EntidadeAuditavel {

    @Setter(AccessLevel.NONE)
    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = Limites.CODIGO, updatable = false)
    private String codigo;

    @Column(nullable = false, length = Limites.TAREFA_TITULO)
    private String titulo;

    @Column(length = Limites.TEXTO_LONGO)
    private String descricao;

    @Column(length = Limites.RESPONSAVEL)
    private String responsavel;

    @Column(length = Limites.TAREFA_CATEGORIA)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Prioridade prioridade = Prioridade.MEDIA;

    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusTarefa status = StatusTarefa.PENDENTE;

    private LocalDate prazo;

    private LocalTime horario;

    @Setter(AccessLevel.NONE)
    @Column(name = "data_conclusao")
    private LocalDate dataConclusao;

    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(name = "recorrencia_frequencia", length = 10)
    private Frequencia frequencia;

    @Setter(AccessLevel.NONE)
    @Column(name = "recorrencia_dia_semana")
    private Short diaSemana;

    @Setter(AccessLevel.NONE)
    @Column(name = "recorrencia_dia_mes")
    private Short diaMes;

    @Setter(AccessLevel.NONE)
    @Column(name = "recorrencia_proxima")
    private LocalDate proxima;

    @Setter(AccessLevel.NONE)
    @Column(name = "ultima_ocorrencia")
    private LocalDate ultimaOcorrencia;

    @Setter(AccessLevel.NONE)
    @Column(name = "ultima_conclusao")
    private LocalDate ultimaConclusao;

    @Setter(AccessLevel.NONE)
    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    @Setter(AccessLevel.NONE)
    @OneToMany(mappedBy = "tarefa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem asc, id asc")
    private List<Subtarefa> subtarefas = new ArrayList<>();

    public Tarefa(Long unidadeId, String codigo, String titulo, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.codigo = codigo;
        this.titulo = titulo;
        this.criadoPorId = criadoPorId;
    }

    public boolean recorrente() {
        return frequencia != null;
    }

    /** Data que vale para prazos: a próxima ocorrência (rotina) ou o prazo (tarefa única). */
    public LocalDate prazoEfetivo() {
        return recorrente() ? proxima : prazo;
    }

    public boolean feitaEm(LocalDate dia) {
        if (status == StatusTarefa.CANCELADA) {
            return false;
        }
        return recorrente() ? dia.equals(ultimaConclusao) : status == StatusTarefa.CONCLUIDA && dia.equals(dataConclusao);
    }

    /**
     * Define (ou tira) a repetição. Se a frequência ou o prazo mudaram, a próxima
     * ocorrência passa a ser o prazo; senão a sequência atual é mantida.
     */
    public void definirRotina(Frequencia novaFrequencia, Short novoDiaSemana, Short novoDiaMes, LocalDate novoPrazo) {
        boolean mudou = !Objects.equals(frequencia, novaFrequencia) || !Objects.equals(prazo, novoPrazo) || proxima == null;
        frequencia = novaFrequencia;
        prazo = novoPrazo;
        if (novaFrequencia == null) {
            diaSemana = null;
            diaMes = null;
            proxima = null;
            return;
        }
        diaSemana = novaFrequencia == Frequencia.SEMANAL ? novoDiaSemana : null;
        diaMes = novaFrequencia == Frequencia.MENSAL ? novoDiaMes : null;
        if (mudou) {
            proxima = novoPrazo;
        }
    }

    /** Conclui a tarefa ou, na rotina, registra que foi feita e avança para a próxima data depois de hoje. */
    public void concluir(LocalDate hoje) {
        if (recorrente()) {
            LocalDate atual = proxima != null ? proxima : (prazo != null ? prazo : hoje);
            if (atual.isAfter(hoje) || hoje.equals(ultimaConclusao)) {
                throw new RegraNegocioExcecao("Já feita neste ciclo. Volta em %s.".formatted(Datas.br(atual)));
            }
            ultimaOcorrencia = atual;
            ultimaConclusao = hoje;
            proxima = Recorrencia.proximaDepoisDe(atual, hoje, frequencia, diaMes == null ? null : diaMes.intValue());
            status = StatusTarefa.PENDENTE;
            return;
        }
        if (status == StatusTarefa.CONCLUIDA) {
            throw new RegraNegocioExcecao("Esta tarefa já está concluída.");
        }
        status = StatusTarefa.CONCLUIDA;
        dataConclusao = hoje;
    }

    /** Desfaz um "concluir" feito por engano (na rotina, só no mesmo dia). */
    public void reabrir(LocalDate hoje) {
        if (recorrente()) {
            if (!hoje.equals(ultimaConclusao)) {
                throw new RegraNegocioExcecao("Só dá para desfazer uma rotina no mesmo dia em que ela foi feita.");
            }
            ultimaConclusao = null;
            if (ultimaOcorrencia != null) {
                proxima = ultimaOcorrencia;
            }
            return;
        }
        status = StatusTarefa.PENDENTE;
        dataConclusao = null;
    }

    /** Troca de situação (select da tela ou coluna do Kanban). Concluir usa {@link #concluir}. */
    public void alterarStatus(StatusTarefa novo, LocalDate hoje) {
        if (novo == StatusTarefa.CONCLUIDA) {
            concluir(hoje);
            return;
        }
        status = novo;
        dataConclusao = null;
    }

    /** Arrastar na agenda: muda o prazo (tarefa única) ou a próxima ocorrência (rotina). */
    public void moverPara(LocalDate data) {
        if (recorrente()) {
            proxima = data;
        } else {
            prazo = data;
        }
    }

    public Subtarefa adicionarSubtarefa(String texto) {
        Subtarefa subtarefa = new Subtarefa(this, texto, (short) subtarefas.size());
        subtarefas.add(subtarefa);
        return subtarefa;
    }

    public Subtarefa subtarefa(Long id) {
        return subtarefas.stream().filter(s -> s.getId().equals(id)).findFirst()
                .orElseThrow(() -> new NaoEncontradoExcecao("Subtarefa"));
    }

    public void marcarSubtarefa(Long id, boolean feita) {
        subtarefa(id).marcar(feita);
    }

    public Subtarefa removerSubtarefa(Long id) {
        Subtarefa subtarefa = subtarefa(id);
        subtarefas.remove(subtarefa);
        return subtarefa;
    }
}

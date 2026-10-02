package br.org.apae.secretaria.pesquisa;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.agenda.Evento;
import br.org.apae.secretaria.agenda.EventoRepositorio;
import br.org.apae.secretaria.atendimentos.Aluno;
import br.org.apae.secretaria.atendimentos.AlunoRepositorio;
import br.org.apae.secretaria.atendimentos.Profissional;
import br.org.apae.secretaria.atendimentos.ProfissionalRepositorio;
import br.org.apae.secretaria.documentos.Documento;
import br.org.apae.secretaria.documentos.DocumentoRepositorio;
import br.org.apae.secretaria.empresas.Empresa;
import br.org.apae.secretaria.empresas.EmpresaRepositorio;
import br.org.apae.secretaria.gerador.DocumentoGerado;
import br.org.apae.secretaria.gerador.DocumentoGeradoRepositorio;
import br.org.apae.secretaria.pesquisa.dto.ResultadoPesquisa;
import br.org.apae.secretaria.pesquisa.dto.ResultadoPesquisa.TipoResultado;
import br.org.apae.secretaria.projetos.Execucao;
import br.org.apae.secretaria.projetos.ExecucaoRepositorio;
import br.org.apae.secretaria.projetos.Recurso;
import br.org.apae.secretaria.projetos.RecursoRepositorio;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.tarefas.Tarefa;
import br.org.apae.secretaria.tarefas.TarefaRepositorio;
import lombok.RequiredArgsConstructor;

/**
 * Pesquisa geral (old/js/08-pesquisa-historico.js): procura o termo nos módulos que o usuário pode ler,
 * sem diferenciar acento nem maiúscula, com pontuação (igual 50, começa 25, contém 5 por ocorrência) × peso do campo.
 */
@Service
@RequiredArgsConstructor
public class ServicoPesquisa {

    private static final int MINIMO_CARACTERES = 2;
    private static final int MAXIMO_POR_TIPO = 25;
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Cargos que só enxergam os próprios atendimentos: não pesquisam alunos nem profissionais. */
    private static final List<String> CARGOS_VINCULADOS = List.of("PROFESSOR", "PROFISSIONAL");

    private final TarefaRepositorio tarefas;
    private final EventoRepositorio eventos;
    private final DocumentoRepositorio documentos;
    private final DocumentoGeradoRepositorio gerados;
    private final RecursoRepositorio recursos;
    private final ExecucaoRepositorio execucoes;
    private final EmpresaRepositorio empresas;
    private final AlunoRepositorio alunos;
    private final ProfissionalRepositorio profissionais;
    private final ContextoSeguranca contexto;

    /** Campo pesquisável com o seu peso. */
    private record Campo(String texto, double peso) {
        static Campo de(String texto, double peso) {
            return new Campo(texto, peso);
        }
    }

    @Transactional(readOnly = true)
    public List<ResultadoPesquisa> pesquisar(String termo) {
        String q = normalizar(termo);
        if (q.length() < MINIMO_CARACTERES) {
            return List.of();
        }
        Long unidadeId = contexto.unidadeLeitura();
        UsuarioAutenticado usuario = contexto.usuario();
        List<ResultadoPesquisa> resultado = new ArrayList<>();
        if (usuario.possui("TAREFA_LER")) {
            resultado.addAll(buscar(q, tarefas.findByUnidadeId(unidadeId), TipoResultado.TAREFA, t -> t.getId(),
                    t -> t.getTitulo(), t -> List.of(prazo(t), t.getResponsavel()),
                    t -> List.of(Campo.de(t.getTitulo(), 3), Campo.de(t.getDescricao(), 2), Campo.de(t.getCategoria(), 1.5),
                            Campo.de(t.getResponsavel(), 1))));
        }
        if (usuario.possui("AGENDA_LER")) {
            resultado.addAll(buscar(q, eventos.findByUnidadeId(unidadeId), TipoResultado.EVENTO, Evento::getId, Evento::getTitulo,
                    e -> List.of(data(e.getData()), String.valueOf(e.getHorarioInicio() == null ? "" : e.getHorarioInicio()),
                            e.getLocal()),
                    e -> List.of(Campo.de(e.getTitulo(), 3), Campo.de(e.getLocal(), 1.5), Campo.de(e.getResponsavel(), 1),
                            Campo.de(e.getParticipantes(), 1), Campo.de(e.getDescricao(), 1))));
        }
        if (usuario.possui("DOCUMENTO_LER")) {
            resultado.addAll(buscar(q, documentos.findByUnidadeIdOrderByNomeAsc(unidadeId), TipoResultado.DOCUMENTO,
                    Documento::getId, Documento::getNome,
                    d -> List.of(d.getDataValidade() == null ? "" : "validade " + data(d.getDataValidade()), d.getResponsavel()),
                    d -> List.of(Campo.de(d.getNome(), 3), Campo.de(d.getDescricao(), 2),
                            Campo.de(d.getCategoria().name(), 1.5), Campo.de(d.getResponsavel(), 1))));
        }
        if (usuario.possui("GERADOR_LER")) {
            resultado.addAll(buscar(q, gerados.findByUnidadeIdOrderByDataGeracaoDescIdDesc(unidadeId), TipoResultado.GERADO,
                    DocumentoGerado::getId, d -> d.getTitulo() + (d.getNumero() == null ? "" : " " + d.getNumero()),
                    d -> List.of("gerado em " + data(d.getDataGeracao()), d.getVinculoRotulo()),
                    d -> List.of(Campo.de(d.getTitulo(), 3), Campo.de(d.getNumero(), 2), Campo.de(d.getModeloNome(), 1.5),
                            Campo.de(d.getVinculoRotulo(), 1))));
        }
        if (usuario.possui("PROJETO_LER")) {
            resultado.addAll(buscar(q, recursos.findByUnidadeIdOrderByDataInicioDescIdDesc(unidadeId), TipoResultado.RECURSO,
                    Recurso::getId, Recurso::getNome, r -> List.of(r.getCodigo(), r.getFonteRecurso()),
                    r -> List.of(Campo.de(r.getNome(), 3), Campo.de(r.getCodigo(), 2), Campo.de(r.getFonteRecurso(), 1.5),
                            Campo.de(r.getOrgaoRepassador(), 1), Campo.de(r.getResponsavel(), 1))));
            resultado.addAll(buscar(q, execucoes.findByUnidadeId(unidadeId), TipoResultado.EXECUCAO, Execucao::getId,
                    Execucao::getNome, e -> List.of(e.getCodigo(), e.getResponsavel()),
                    e -> List.of(Campo.de(e.getNome(), 3), Campo.de(e.getCodigo(), 2), Campo.de(e.getFonteRecurso(), 1.5),
                            Campo.de(e.getObjetivo(), 1), Campo.de(e.getResponsavel(), 1))));
        }
        if (usuario.possui("EMPRESA_LER")) {
            resultado.addAll(buscar(q, empresas.findByUnidadeIdOrderByRazaoSocialAsc(unidadeId), TipoResultado.EMPRESA,
                    Empresa::getId, e -> e.getRazaoSocial() != null ? e.getRazaoSocial() : e.getNomeFantasia(),
                    e -> List.of(e.getCnpj(), e.getMunicipio()),
                    e -> List.of(Campo.de(e.getRazaoSocial(), 3), Campo.de(e.getNomeFantasia(), 2), Campo.de(e.getCnpj(), 1.5),
                            Campo.de(e.getRepresentante(), 1), Campo.de(e.getMunicipio(), 1))));
        }
        if (usuario.possui("ATENDIMENTO_LER") && !CARGOS_VINCULADOS.contains(usuario.cargoCodigo())) {
            resultado.addAll(buscar(q, alunos.findByUnidadeIdOrderByNomeAsc(unidadeId), TipoResultado.ALUNO, Aluno::getId,
                    Aluno::getNome, a -> List.of("Aluno"), a -> List.of(Campo.de(a.getNome(), 3))));
            resultado.addAll(buscar(q, profissionais.findByUnidadeIdOrderByNomeAsc(unidadeId), TipoResultado.PROFISSIONAL,
                    Profissional::getId, Profissional::getNome, p -> List.of("Profissional"),
                    p -> List.of(Campo.de(p.getNome(), 3))));
        }
        return resultado;
    }

    /** Pontua cada item, descarta quem não casou e fica com os {@value #MAXIMO_POR_TIPO} melhores do tipo. */
    private <T> List<ResultadoPesquisa> buscar(String q, List<T> itens, TipoResultado tipo, Function<T, Long> id,
            Function<T, String> titulo, Function<T, List<String>> detalhes, Function<T, List<Campo>> campos) {
        return itens.stream()
                .map(item -> new Pontuado<>(item, campos.apply(item).stream().mapToDouble(c -> pontuar(c.texto(), q, c.peso())).sum()))
                .filter(p -> p.pontos() > 0)
                .sorted(Comparator.comparingDouble((Pontuado<T> p) -> p.pontos()).reversed())
                .limit(MAXIMO_POR_TIPO)
                .map(p -> new ResultadoPesquisa(tipo, id.apply(p.item()), titulo.apply(p.item()),
                        detalhes.apply(p.item()).stream().filter(d -> d != null && !d.isBlank()).toList()))
                .toList();
    }

    private record Pontuado<T>(T item, double pontos) {
    }

    private static double pontuar(String texto, String q, double peso) {
        if (texto == null || texto.isBlank()) {
            return 0;
        }
        String t = normalizar(texto);
        if (t.equals(q)) {
            return 50 * peso;
        }
        if (t.startsWith(q)) {
            return 25 * peso;
        }
        int ocorrencias = 0;
        for (int i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + q.length())) {
            ocorrencias++;
        }
        return ocorrencias * 5 * peso;
    }

    /** Sem acento, sem maiúscula e sem espaços sobrando ("oficio" acha "Ofício"). */
    static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase().trim();
    }

    private static String data(LocalDate data) {
        return data == null ? "" : data.format(DATA);
    }

    private static String prazo(Tarefa t) {
        LocalDate prazo = t.prazoEfetivo();
        return prazo == null ? "" : "prazo " + data(prazo);
    }
}

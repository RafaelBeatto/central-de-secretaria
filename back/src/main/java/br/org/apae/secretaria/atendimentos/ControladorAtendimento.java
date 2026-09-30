package br.org.apae.secretaria.atendimentos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.atendimentos.dto.AlunoResposta;
import br.org.apae.secretaria.atendimentos.dto.AtendimentoResposta;
import br.org.apae.secretaria.atendimentos.dto.ProfissionalResposta;
import br.org.apae.secretaria.atendimentos.dto.RequisicaoAtendimentoLote;
import br.org.apae.secretaria.atendimentos.dto.RequisicaoNovoAtendimento;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.MesclarCadastro;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.NovaPresenca;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.Remarcar;
import br.org.apae.secretaria.atendimentos.dto.RequisicoesAtendimento.RenomearCadastro;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/atendimentos")
@RequiredArgsConstructor
public class ControladorAtendimento {

    private final ServicoAtendimento atendimentos;
    private final ServicoCadastroAtendimento cadastro;

    // ---------- atendimentos ----------

    @GetMapping
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<AtendimentoResposta> itens(@RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate fim) {
        return atendimentos.itens(inicio, fim);
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public AtendimentoResposta detalhe(@PathVariable Long id) {
        return atendimentos.detalhe(id);
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return atendimentos.historicoDo(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public AtendimentoResposta criar(@Valid @RequestBody RequisicaoNovoAtendimento requisicao) {
        return atendimentos.criar(requisicao);
    }

    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public int criarLote(@Valid @RequestBody RequisicaoAtendimentoLote requisicao) {
        return atendimentos.criarLote(requisicao);
    }

    @PostMapping("/copiar-semana")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public int copiarSemanaAnterior(@RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate segunda) {
        return atendimentos.copiarSemanaAnterior(segunda);
    }

    @PatchMapping("/{id}/presenca")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public AtendimentoResposta atualizarPresenca(@PathVariable Long id, @Valid @RequestBody NovaPresenca requisicao) {
        return atendimentos.atualizarPresenca(id, requisicao);
    }

    @PostMapping("/{id}/remarcar")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public AtendimentoResposta remarcar(@PathVariable Long id, @Valid @RequestBody Remarcar requisicao) {
        return atendimentos.remarcar(id, requisicao);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void excluir(@PathVariable Long id) {
        atendimentos.excluir(id);
    }

    @PostMapping("/{id}/encerrar-serie")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public int encerrarSerie(@PathVariable Long id) {
        return atendimentos.encerrarSerie(id);
    }

    // ---------- alunos ----------

    @GetMapping("/alunos")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<AlunoResposta> listarAlunos() {
        return cadastro.listarAlunos();
    }

    @GetMapping("/alunos/{id}/historico")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<AtendimentoResposta> historicoDoAluno(@PathVariable Long id) {
        return atendimentos.historicoDoAluno(id);
    }

    @PutMapping("/alunos/{id}")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void renomearAluno(@PathVariable Long id, @Valid @RequestBody RenomearCadastro requisicao) {
        cadastro.renomearAluno(id, requisicao.nome());
    }

    @PostMapping("/alunos/{id}/mesclar")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void mesclarAluno(@PathVariable Long id, @Valid @RequestBody MesclarCadastro requisicao) {
        cadastro.mesclarAluno(id, requisicao.destinoId());
    }

    @DeleteMapping("/alunos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void excluirAluno(@PathVariable Long id) {
        cadastro.excluirAluno(id);
    }

    @PostMapping("/alunos/{id}/contato-familia")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void contatoFamilia(@PathVariable Long id) {
        cadastro.marcarContatoFamilia(id);
    }

    // ---------- profissionais ----------

    @GetMapping("/profissionais")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<ProfissionalResposta> listarProfissionais() {
        return cadastro.listarProfissionais();
    }

    @GetMapping("/profissionais/{id}/historico")
    @PreAuthorize(Permissoes.ATENDIMENTO_LER)
    public List<AtendimentoResposta> historicoDoProfissional(@PathVariable Long id) {
        return atendimentos.historicoDoProfissional(id);
    }

    @PutMapping("/profissionais/{id}")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void renomearProfissional(@PathVariable Long id, @Valid @RequestBody RenomearCadastro requisicao) {
        cadastro.renomearProfissional(id, requisicao.nome());
    }

    @PostMapping("/profissionais/{id}/mesclar")
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void mesclarProfissional(@PathVariable Long id, @Valid @RequestBody MesclarCadastro requisicao) {
        cadastro.mesclarProfissional(id, requisicao.destinoId());
    }

    @DeleteMapping("/profissionais/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.ATENDIMENTO_ESCREVER)
    public void excluirProfissional(@PathVariable Long id) {
        cadastro.excluirProfissional(id);
    }
}

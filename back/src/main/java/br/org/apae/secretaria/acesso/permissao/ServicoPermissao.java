package br.org.apae.secretaria.acesso.permissao;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.acesso.cargo.Cargo;
import br.org.apae.secretaria.acesso.cargo.CargoRepositorio;
import br.org.apae.secretaria.acesso.cargo.dto.CargoResposta;
import br.org.apae.secretaria.acesso.permissao.dto.MatrizPermissoes;
import br.org.apae.secretaria.acesso.permissao.dto.MatrizPermissoes.LinhaCargo;
import br.org.apae.secretaria.acesso.permissao.dto.MatrizPermissoes.PermissaoResposta;
import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.ServicoUsuarioAutenticado;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import br.org.apae.secretaria.sistema.historico.AcaoHistorico;
import br.org.apae.secretaria.sistema.historico.ModuloHistorico;
import br.org.apae.secretaria.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Ajuste da matriz de permissões por unidade.
 * Regras: só a própria unidade é ajustada; só cargos abaixo do seu; e ninguém
 * concede uma permissão que ele mesmo não tem (evita escalada de privilégio).
 */
@Service
@RequiredArgsConstructor
public class ServicoPermissao {

    private final PermissaoRepositorio repositorio;
    private final CargoRepositorio cargos;
    private final ContextoSeguranca contexto;
    private final ServicoUsuarioAutenticado servicoUsuario;
    private final ServicoHistorico historico;

    @Transactional(readOnly = true)
    public MatrizPermissoes matriz() {
        Long unidadeId = contexto.unidadeLeitura();
        UsuarioAutenticado eu = contexto.usuario();
        boolean podeEditarUnidade = unidadeId.equals(eu.unidadeId()) && eu.possui("PERMISSAO_ESCREVER");
        Map<Short, String> codigoPorId = repositorio.findAll().stream()
                .collect(Collectors.toMap(Permissao::getId, Permissao::getCodigo));

        List<LinhaCargo> linhas = cargos.findAllByOrderByNivelAscIdAsc().stream()
                .filter(cargo -> !cargo.administradorSistema())
                .map(cargo -> {
                    Set<String> efetivas = repositorio.codigosEfetivos(cargo.getId(), unidadeId);
                    Set<String> padrao = repositorio.idsPadraoDoCargo(cargo.getId()).stream()
                            .map(codigoPorId::get).collect(Collectors.toSet());
                    Set<String> ajustadas = diferencaSimetrica(efetivas, padrao);
                    boolean editavel = podeEditarUnidade && cargo.getNivel() > eu.nivelCargo();
                    return new LinhaCargo(CargoResposta.de(cargo), editavel, efetivas, ajustadas);
                })
                .toList();

        List<PermissaoResposta> permissoes = repositorio.findAllByOrderByModuloAscIdAsc().stream()
                .map(p -> new PermissaoResposta(p.getCodigo(), p.getModulo(), p.getDescricao()))
                .toList();
        return new MatrizPermissoes(unidadeId, permissoes, linhas);
    }

    @Transactional
    public MatrizPermissoes atualizar(Short cargoId, Set<String> desejadas) {
        Cargo cargo = cargoEditavel(cargoId);
        Long unidadeId = contexto.unidadeEscrita();
        Map<String, Permissao> porCodigo = repositorio.findAll().stream()
                .collect(Collectors.toMap(Permissao::getCodigo, Function.identity()));
        Set<String> desconhecidas = new HashSet<>(desejadas);
        desconhecidas.removeAll(porCodigo.keySet());
        if (!desconhecidas.isEmpty()) {
            throw new RegraNegocioExcecao("Permissões inexistentes: " + String.join(", ", desconhecidas));
        }
        Set<String> novas = new HashSet<>(desejadas);
        novas.removeAll(repositorio.codigosEfetivos(cargo.getId(), unidadeId));
        UsuarioAutenticado eu = contexto.usuario();
        if (!eu.administradorSistema() && !eu.permissoes().containsAll(novas)) {
            throw new AcessoNegadoExcecao("Você não pode conceder permissões que você mesmo não tem.");
        }

        Set<Short> padrao = repositorio.idsPadraoDoCargo(cargo.getId());
        repositorio.removerAjustes(unidadeId, cargo.getId());
        porCodigo.values().forEach(permissao -> {
            boolean querida = desejadas.contains(permissao.getCodigo());
            boolean naMatrizPadrao = padrao.contains(permissao.getId());
            if (querida != naMatrizPadrao) {
                repositorio.inserirAjuste(unidadeId, cargo.getId(), permissao.getId(), querida);
            }
        });
        servicoUsuario.esquecerTodos();
        historico.registrar(ModuloHistorico.PERMISSOES, AcaoHistorico.EDICAO,
                "Permissões do cargo %s ajustadas nesta unidade.".formatted(cargo.getNome()), "CARGO", cargo.getId().longValue());
        return matriz();
    }

    @Transactional
    public MatrizPermissoes restaurarPadrao(Short cargoId) {
        Cargo cargo = cargoEditavel(cargoId);
        repositorio.removerAjustes(contexto.unidadeEscrita(), cargo.getId());
        servicoUsuario.esquecerTodos();
        historico.registrar(ModuloHistorico.PERMISSOES, AcaoHistorico.EDICAO,
                "Permissões do cargo %s voltaram ao padrão.".formatted(cargo.getNome()), "CARGO", cargo.getId().longValue());
        return matriz();
    }

    private Cargo cargoEditavel(Short cargoId) {
        Cargo cargo = cargos.findById(cargoId).orElseThrow(() -> new NaoEncontradoExcecao("Cargo"));
        if (cargo.administradorSistema() || cargo.getNivel() <= contexto.usuario().nivelCargo()) {
            throw new AcessoNegadoExcecao("Você só pode ajustar as permissões de cargos abaixo do seu.");
        }
        return cargo;
    }

    private static Set<String> diferencaSimetrica(Set<String> a, Set<String> b) {
        Set<String> resultado = new HashSet<>(a);
        resultado.addAll(b);
        Set<String> comum = new HashSet<>(a);
        comum.retainAll(b);
        resultado.removeAll(comum);
        return resultado;
    }
}

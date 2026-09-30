package br.org.apae.secretaria.acesso.permissao;

import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * Permissões e matriz cargo × permissão. As tabelas de ligação (sem entidade própria)
 * são acessadas por SQL nativo: são só pares de chaves.
 */
public interface PermissaoRepositorio extends JpaRepository<Permissao, Short> {

    List<Permissao> findAllByOrderByModuloAscIdAsc();

    @Query(value = "select p.codigo from acesso.permissao p", nativeQuery = true)
    Set<String> todosCodigos();

    /** Permissões efetivas: matriz padrão do cargo, ajustada pelas concessões/retiradas da unidade. */
    @Query(value = """
            select p.codigo from acesso.permissao p
             where (exists (select 1 from acesso.cargo_permissao cp
                             where cp.cargo_id = :cargoId and cp.permissao_id = p.id)
                    and not exists (select 1 from acesso.unidade_cargo_permissao ucp
                                     where ucp.unidade_id = :unidadeId and ucp.cargo_id = :cargoId
                                       and ucp.permissao_id = p.id and not ucp.concedida))
                or exists (select 1 from acesso.unidade_cargo_permissao ucp
                            where ucp.unidade_id = :unidadeId and ucp.cargo_id = :cargoId
                              and ucp.permissao_id = p.id and ucp.concedida)
            """, nativeQuery = true)
    Set<String> codigosEfetivos(short cargoId, long unidadeId);

    @Query(value = "select permissao_id from acesso.cargo_permissao where cargo_id = :cargoId", nativeQuery = true)
    Set<Short> idsPadraoDoCargo(short cargoId);

    @Modifying
    @Query(value = "delete from acesso.unidade_cargo_permissao where unidade_id = :unidadeId and cargo_id = :cargoId",
            nativeQuery = true)
    void removerAjustes(long unidadeId, short cargoId);

    @Modifying
    @Query(value = """
            insert into acesso.unidade_cargo_permissao (unidade_id, cargo_id, permissao_id, concedida)
            values (:unidadeId, :cargoId, :permissaoId, :concedida)
            """, nativeQuery = true)
    void inserirAjuste(long unidadeId, short cargoId, short permissaoId, boolean concedida);
}

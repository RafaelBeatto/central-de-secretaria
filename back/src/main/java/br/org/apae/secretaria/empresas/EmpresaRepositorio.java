package br.org.apae.secretaria.empresas;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmpresaRepositorio extends JpaRepository<Empresa, Long> {

    List<Empresa> findByUnidadeIdOrderByRazaoSocialAsc(Long unidadeId);

    Optional<Empresa> findByUnidadeIdAndCnpj(Long unidadeId, String cnpj);

    Optional<Empresa> findByUnidadeIdAndRazaoSocialIgnoreCase(Long unidadeId, String razaoSocial);

    Optional<Empresa> findByUnidadeIdAndCnpjAndIdNot(Long unidadeId, String cnpj, Long id);

    Optional<Empresa> findByUnidadeIdAndRazaoSocialIgnoreCaseAndIdNot(Long unidadeId, String razaoSocial, Long id);
}

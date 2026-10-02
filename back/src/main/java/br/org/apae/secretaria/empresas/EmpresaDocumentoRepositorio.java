package br.org.apae.secretaria.empresas;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmpresaDocumentoRepositorio extends JpaRepository<EmpresaDocumento, Long> {

    List<EmpresaDocumento> findByEmpresaIdOrderByNomeAsc(Long empresaId);

    List<EmpresaDocumento> findByEmpresaIdInOrderByNomeAsc(Collection<Long> empresaIds);
}

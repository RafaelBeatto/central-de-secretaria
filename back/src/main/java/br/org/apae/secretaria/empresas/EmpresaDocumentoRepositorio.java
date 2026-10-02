package br.org.apae.secretaria.empresas;

<<<<<<< HEAD
import java.util.Collection;
=======
>>>>>>> 426a94c127d17a98c09e288f8ca7b11985d0744f
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmpresaDocumentoRepositorio extends JpaRepository<EmpresaDocumento, Long> {

    List<EmpresaDocumento> findByEmpresaIdOrderByNomeAsc(Long empresaId);
<<<<<<< HEAD

    List<EmpresaDocumento> findByEmpresaIdInOrderByNomeAsc(Collection<Long> empresaIds);
=======
>>>>>>> 426a94c127d17a98c09e288f8ca7b11985d0744f
}

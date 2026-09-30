package br.org.apae.secretaria.sistema.arquivo;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ArquivoRepositorio extends JpaRepository<Arquivo, Long> {
}

package br.org.apae.secretaria.vinculos.dto;

import br.org.apae.secretaria.vinculos.TipoRegistro;

/** Registro do outro lado de um vínculo (ou candidato a ser ligado): o tipo e o id levam até ele. */
public record Vinculado(TipoRegistro tipo, Long id, String titulo, String detalhe) {
}

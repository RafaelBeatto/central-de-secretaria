package br.org.apae.secretaria.comum.web;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Página de resultados com formato estável para o front (não expõe a estrutura interna do Spring Data). */
public record Pagina<T>(List<T> itens, int pagina, int tamanho, long total, int totalPaginas) {

    public static <E, T> Pagina<T> de(Page<E> pagina, Function<E, T> conversor) {
        return new Pagina<>(pagina.map(conversor).getContent(), pagina.getNumber(), pagina.getSize(),
                pagina.getTotalElements(), pagina.getTotalPages());
    }
}

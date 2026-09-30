package br.org.apae.secretaria.agenda;

/** Até onde vale uma edição ou exclusão feita num evento que se repete. */
public enum EscopoSerie {
    /** Só a data escolhida. */
    SO_ESTA,
    /** A data escolhida e as seguintes da série. */
    ESTA_E_PROXIMAS,
    /** Todas as datas da série (só na exclusão). */
    TODAS
}

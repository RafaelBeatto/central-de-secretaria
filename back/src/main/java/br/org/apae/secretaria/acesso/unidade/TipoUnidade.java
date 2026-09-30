package br.org.apae.secretaria.acesso.unidade;

import java.util.Optional;

/** Nível da unidade na federação. Cada tipo só pode ter filhos do tipo imediatamente abaixo. */
public enum TipoUnidade {
    NACIONAL, ESTADUAL, MUNICIPAL;

    public Optional<TipoUnidade> tipoDasSubordinadas() {
        return switch (this) {
            case NACIONAL -> Optional.of(ESTADUAL);
            case ESTADUAL -> Optional.of(MUNICIPAL);
            case MUNICIPAL -> Optional.empty();
        };
    }
}

package br.org.apae.secretaria.seguranca;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import br.org.apae.secretaria.acesso.usuario.Usuario;
import br.org.apae.secretaria.configuracao.PropriedadesAplicacao;

/**
 * Emite o token de acesso (JWT curto) e gera o token de renovação (valor aleatório;
 * no banco fica só o SHA-256 dele).
 */
@Service
public class ServicoToken {

    public static final String EMISSOR = "central-secretaria";

    private final JwtEncoder codificador;
    private final Duration validadeAcesso;
    private final Duration validadeRenovacao;
    private final SecureRandom aleatorio = new SecureRandom();

    public ServicoToken(JwtEncoder codificador, PropriedadesAplicacao propriedades) {
        this.codificador = codificador;
        this.validadeAcesso = Duration.ofMinutes(propriedades.jwt().validadeAcessoMinutos());
        this.validadeRenovacao = Duration.ofDays(propriedades.jwt().validadeRenovacaoDias());
    }

    public record TokenEmitido(String valor, Instant expiraEm) {
    }

    public TokenEmitido emitirAcesso(Usuario usuario) {
        Instant agora = Instant.now();
        Instant expira = agora.plus(validadeAcesso);
        JwtClaimsSet dados = JwtClaimsSet.builder()
                .issuer(EMISSOR)
                .subject(String.valueOf(usuario.getId()))
                .issuedAt(agora)
                .expiresAt(expira)
                .claim("login", usuario.getLogin())
                .build();
        JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
        String valor = codificador.encode(JwtEncoderParameters.from(cabecalho, dados)).getTokenValue();
        return new TokenEmitido(valor, expira);
    }

    public TokenEmitido gerarRenovacao() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return new TokenEmitido(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes),
                Instant.now().plus(validadeRenovacao));
    }

    public static String hash(String valor) {
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}

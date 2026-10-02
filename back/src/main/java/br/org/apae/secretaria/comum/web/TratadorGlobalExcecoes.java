package br.org.apae.secretaria.comum.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import br.org.apae.secretaria.comum.excecao.AcessoNegadoExcecao;
import br.org.apae.secretaria.comum.excecao.NaoEncontradoExcecao;
import br.org.apae.secretaria.comum.excecao.RegraNegocioExcecao;
import jakarta.validation.ConstraintViolationException;
import software.amazon.awssdk.core.exception.SdkException;

/**
 * Converte exceções em respostas RFC 9457 (ProblemDetail) com mensagens em português.
 * Erros de validação trazem o mapa "campos" (campo → mensagem) que o front exibe no formulário.
 */
@RestControllerAdvice
public class TratadorGlobalExcecoes {

    private static final Logger log = LoggerFactory.getLogger(TratadorGlobalExcecoes.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validacao(MethodArgumentNotValidException excecao) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError erro : excecao.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(erro.getField(), erro.getDefaultMessage());
        }
        excecao.getBindingResult().getGlobalErrors()
                .forEach(erro -> campos.putIfAbsent(erro.getObjectName(), erro.getDefaultMessage()));
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Confira os campos destacados.");
        problema.setProperty("campos", campos);
        return problema;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail validacaoParametros(ConstraintViolationException excecao) {
        Map<String, String> campos = new LinkedHashMap<>();
        excecao.getConstraintViolations().forEach(v -> campos.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Parâmetros inválidos.");
        problema.setProperty("campos", campos);
        return problema;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail corpoInvalido(HttpMessageNotReadableException excecao) {
        return problema(HttpStatus.BAD_REQUEST, "Os dados enviados estão em formato inválido.");
    }

    @ExceptionHandler(RegraNegocioExcecao.class)
    public ProblemDetail regraNegocio(RegraNegocioExcecao excecao) {
        return problema(HttpStatus.UNPROCESSABLE_CONTENT, excecao.getMessage());
    }

    @ExceptionHandler(NaoEncontradoExcecao.class)
    public ProblemDetail naoEncontrado(NaoEncontradoExcecao excecao) {
        return problema(HttpStatus.NOT_FOUND, excecao.getMessage());
    }

    @ExceptionHandler({ AcessoNegadoExcecao.class, AccessDeniedException.class, AuthorizationDeniedException.class })
    public ProblemDetail acessoNegado(RuntimeException excecao) {
        String mensagem = excecao instanceof AcessoNegadoExcecao
                ? excecao.getMessage()
                : "Você não tem permissão para esta operação.";
        return problema(HttpStatus.FORBIDDEN, mensagem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail naoAutenticado(AuthenticationException excecao) {
        return problema(HttpStatus.UNAUTHORIZED, excecao.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail arquivoGrande(MaxUploadSizeExceededException excecao) {
        return problema(HttpStatus.CONTENT_TOO_LARGE, "O arquivo é maior que o permitido.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail integridade(DataIntegrityViolationException excecao) {
        log.warn("Violação de integridade: {}", excecao.getMostSpecificCause().getMessage());
        return problema(HttpStatus.CONFLICT,
                "Não foi possível salvar: o registro já existe ou está em uso por outro cadastro.");
    }

    /** Falha ao falar com o S3 (sem chaves da AWS, bucket inexistente, sem rede…): o arquivo não foi guardado. */
    @ExceptionHandler(SdkException.class)
    public ProblemDetail armazenamento(SdkException excecao) {
        log.error("Falha no armazenamento de arquivos (S3)", excecao);
        return problema(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível guardar/abrir o arquivo: o armazenamento (AWS S3) não está configurado ou não respondeu. "
                        + "Confira as chaves da AWS no arquivo back/.env (modelo: back/.env.exemplo).");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail inesperado(Exception excecao) {
        log.error("Erro inesperado", excecao);
        return problema(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado. Tente novamente em instantes.");
    }

    private static ProblemDetail problema(HttpStatus status, String mensagem) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, mensagem);
        problema.setTitle(status.getReasonPhrase());
        return problema;
    }
}

import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'src/store/Store';
import { mensagemDeErro } from 'src/utils/erroApi';

/**
 * Carrega dados da API com estado de carregamento/erro. Recarrega sozinho quando
 * muda a unidade em consulta (todas as consultas dependem dela) ou as dependências.
 * Ignora respostas atrasadas de consultas anteriores.
 */
export function useConsulta<T>(consulta: () => Promise<T>, dependencias: DependencyList = []) {
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);
  const [dados, setDados] = useState<T | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const ultimaChamada = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(consulta, [unidadeVisualizadaId, ...dependencias]);

  const recarregar = useCallback(async () => {
    const chamada = ++ultimaChamada.current;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await executar();
      if (chamada === ultimaChamada.current) setDados(resultado);
    } catch (e) {
      if (chamada === ultimaChamada.current) setErro(mensagemDeErro(e));
    } finally {
      if (chamada === ultimaChamada.current) setCarregando(false);
    }
  }, [executar]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, carregando, erro, recarregar, definirDados: setDados };
}

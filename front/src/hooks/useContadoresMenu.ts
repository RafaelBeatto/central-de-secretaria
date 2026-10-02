import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { carregarDadosPainel } from 'src/servicos/painel';
import { montarPendencias } from 'src/utils/pendencias';
import { useSelector } from 'src/store/Store';
import { usePermissao } from './usePermissao';

export interface ContadorMenu {
  n: number;
  cor: 'error' | 'warning' | 'primary';
}

const INTERVALO = 3 * 60 * 1000;
const ESPERA_MINIMA = 60 * 1000;

/**
 * Selos do menu (old: contadores da barra lateral): pendências, tarefas atrasadas, documentos vencidos,
 * atendimentos sem presença e compromissos de hoje. Atualiza a cada 3 minutos e ao trocar de tela
 * (no máximo 1 vez por minuto), sempre da unidade em consulta.
 */
export function useContadoresMenu(): Record<string, ContadorMenu> {
  const { tem } = usePermissao();
  const { pathname } = useLocation();
  const unidadeId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);
  const [contadores, setContadores] = useState<Record<string, ContadorMenu>>({});
  const ultima = useRef(0);

  const atualizar = useCallback(async () => {
    ultima.current = Date.now();
    try {
      const pendencias = montarPendencias(await carregarDadosPainel(tem));
      const conta = (filtro: (p: (typeof pendencias)[number]) => boolean) => pendencias.filter(filtro).length;
      const resultado: Record<string, ContadorMenu> = {};
      const pr = (caminho: string, n: number, cor: ContadorMenu['cor']) => {
        if (n > 0) resultado[caminho] = { n, cor };
      };
      pr('/pendencias', pendencias.length, conta((p) => p.categoria === 'atrasado') ? 'error' : 'warning');
      pr('/secretaria', conta((p) => p.origem === 'tarefas' && p.categoria === 'atrasado'), 'error');
      pr('/documentos', conta((p) => p.origem === 'documentos' && p.categoria === 'atrasado'), 'error');
      pr('/atendimentos', conta((p) => p.acao?.tipo === 'atendimento'), 'warning');
      pr('/agenda', conta((p) => p.origem === 'agenda'), 'primary');
      setContadores(resultado);
    } catch {
      // Selo é conveniência: se falhar, o menu continua sem ele.
    }
  }, [tem]);

  useEffect(() => {
    atualizar();
    const timer = setInterval(atualizar, INTERVALO);
    return () => clearInterval(timer);
  }, [atualizar, unidadeId]);

  useEffect(() => {
    if (Date.now() - ultima.current > ESPERA_MINIMA) atualizar();
  }, [pathname, atualizar]);

  return contadores;
}

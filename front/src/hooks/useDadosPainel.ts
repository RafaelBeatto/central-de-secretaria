import { carregarDadosPainel } from 'src/servicos/painel';
import { useConsulta } from './useConsulta';
import { usePermissao } from './usePermissao';

/** Fontes do Painel e das Pendências (recarrega quando muda a unidade em consulta). */
export function useDadosPainel() {
  const { tem } = usePermissao();
  return useConsulta(() => carregarDadosPainel(tem), [tem]);
}

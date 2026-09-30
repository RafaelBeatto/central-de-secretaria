import { useCallback } from 'react';
import { useSelector } from 'src/store/Store';
import type { CodigoPermissao } from 'src/constantes/permissoes';

/**
 * Permissões do usuário logado.
 * - tem(p): o usuário possui a permissão (para mostrar menu e telas).
 * - podeAlterar(p): possui e está na própria unidade (unidade superior só consulta).
 */
export function usePermissao() {
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const visualizandoOutra = useSelector((s) => s.autenticacao.unidadeVisualizadaId !== null);

  const tem = useCallback(
    (permissao: CodigoPermissao) => !!usuario?.permissoes.includes(permissao),
    [usuario],
  );
  const podeAlterar = useCallback(
    (permissao: CodigoPermissao) => tem(permissao) && !visualizandoOutra,
    [tem, visualizandoOutra],
  );

  return { tem, podeAlterar, somenteLeitura: visualizandoOutra };
}

import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'src/store/Store';
import { usePermissao } from 'src/hooks/usePermissao';
import type { CodigoPermissao } from 'src/constantes/permissoes';
import Spinner from 'src/views/spinner/Spinner';

/** Exige login; quem precisa trocar a senha só acessa a tela de troca. */
export function RotaAutenticada({ children, trocaDeSenha = false }: { children: ReactElement; trocaDeSenha?: boolean }) {
  const { usuario, iniciado } = useSelector((s) => s.autenticacao);
  const local = useLocation();
  if (!iniciado) return <Spinner />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (usuario.trocarSenha && !trocaDeSenha) return <Navigate to="/trocar-senha" replace />;
  return children;
}

/** Só para quem não está logado (tela de entrar). */
export function RotaPublica({ children }: { children: ReactElement }) {
  const { usuario, iniciado } = useSelector((s) => s.autenticacao);
  if (!iniciado) return <Spinner />;
  return usuario ? <Navigate to="/painel" replace /> : children;
}

/** Exige a permissão do módulo; sem ela, mostra a página de acesso negado. */
export function RotaPermissao({ permissao, children }: { permissao?: CodigoPermissao; children: ReactElement }) {
  const { tem } = usePermissao();
  if (permissao && !tem(permissao)) return <Navigate to="/acesso-negado" replace />;
  return children;
}

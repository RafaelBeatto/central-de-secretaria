import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { MODULOS } from './modulos';
import { RotaAutenticada, RotaPermissao, RotaPublica } from './Guardas';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Telas fixas***** */
const Entrar = Loadable(lazy(() => import('../views/autenticacao/Entrar')));
const TrocarSenha = Loadable(lazy(() => import('../views/autenticacao/TrocarSenha')));
const EmConstrucao = Loadable(lazy(() => import('../views/EmConstrucao')));
const Erro = Loadable(lazy(() => import('../views/erro/Erro')));

/** Cada módulo vira uma rota própria, protegida pela permissão dele. */
const rotasDosModulos: RouteObject[] = MODULOS.map((modulo) => {
  const Tela = modulo.tela ? Loadable(modulo.tela) : EmConstrucao;
  return {
    path: modulo.caminho,
    element: (
      <RotaPermissao permissao={modulo.permissao}>
        <Tela />
      </RotaPermissao>
    ),
  };
});

const Router: RouteObject[] = [
  {
    path: '/',
    element: (
      <RotaAutenticada>
        <FullLayout />
      </RotaAutenticada>
    ),
    children: [
      { index: true, element: <Navigate to="/painel" replace /> },
      ...rotasDosModulos,
      { path: '/acesso-negado', element: <Erro codigo={403} /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      {
        path: '/entrar',
        element: (
          <RotaPublica>
            <Entrar />
          </RotaPublica>
        ),
      },
      {
        path: '/trocar-senha',
        element: (
          <RotaAutenticada trocaDeSenha>
            <TrocarSenha />
          </RotaAutenticada>
        ),
      },
      { path: '*', element: <Erro codigo={404} /> },
    ],
  },
];

export default Router;

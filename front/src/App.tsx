import { useEffect } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useRoutes } from 'react-router-dom';
import { ThemeSettings } from './theme/Theme';
import ScrollToTop from './components/shared/ScrollToTop';
import Router from './routes/Router';
import { ProvedorInteracao } from './components/compartilhados/ProvedorInteracao';
import { useDispatch } from './store/Store';
import { iniciarSessao, sessaoEncerrada, usuarioAtualizado } from './store/autenticacao/AutenticacaoSlice';
import { sessao } from './utils/axios';

function App() {
  const routing = useRoutes(Router);
  const theme = ThemeSettings();
  const dispatch = useDispatch();

  useEffect(() => {
    // O cliente HTTP avisa o store quando renova o token ou quando a sessão acaba.
    sessao.aoMudar({
      renovou: (nova) => dispatch(usuarioAtualizado(nova.usuario)),
      expirou: () => dispatch(sessaoEncerrada()),
    });
    dispatch(iniciarSessao());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <ProvedorInteracao>
        <CssBaseline />
        <ScrollToTop>{routing}</ScrollToTop>
      </ProvedorInteracao>
    </ThemeProvider>
  );
}

export default App;

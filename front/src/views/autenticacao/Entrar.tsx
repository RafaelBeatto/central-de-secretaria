import { Alert, Box, Button, Stack } from '@mui/material';
import { Form, Formik } from 'formik';
import { useLocation, useNavigate } from 'react-router-dom';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { useDispatch } from 'src/store/Store';
import { entrar } from 'src/store/autenticacao/AutenticacaoSlice';
import { Yup } from 'src/utils/validacao';
import LayoutAutenticacao from './LayoutAutenticacao';

const esquema = Yup.object({
  login: Yup.string().trim().required('Informe o usuário').max(LIMITES.USUARIO_LOGIN),
  senha: Yup.string().required('Informe a senha').max(LIMITES.SENHA_MAXIMO),
});

/** Login por usuário e senha (contas são criadas por um superior, não há cadastro aberto). */
const Entrar = () => {
  const dispatch = useDispatch();
  const navegar = useNavigate();
  const origem = (useLocation().state as { de?: string } | null)?.de ?? '/painel';

  return (
    <LayoutAutenticacao titulo="Central da Secretaria" subtitulo="Entre com o usuário e a senha que você recebeu.">
      <Formik
        initialValues={{ login: '', senha: '' }}
        validationSchema={esquema}
        onSubmit={async (valores, { setStatus }) => {
          setStatus(undefined);
          const resultado = await dispatch(entrar({ login: valores.login.trim(), senha: valores.senha }));
          if (entrar.fulfilled.match(resultado)) {
            navegar(resultado.payload.trocarSenha ? '/trocar-senha' : origem, { replace: true });
          } else {
            setStatus(resultado.payload as string);
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            {status ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {status}
              </Alert>
            ) : null}
            <Stack>
              <Box>
                <CampoFormik name="login" rotulo="Usuário" limite={LIMITES.USUARIO_LOGIN} autoComplete="username" autoFocus />
              </Box>
              <Box>
                <CampoFormik
                  name="senha"
                  rotulo="Senha"
                  type="password"
                  limite={LIMITES.SENHA_MAXIMO}
                  autoComplete="current-password"
                />
              </Box>
            </Stack>
            <Box mt={3}>
              <Button color="primary" variant="contained" size="large" fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </LayoutAutenticacao>
  );
};

export default Entrar;

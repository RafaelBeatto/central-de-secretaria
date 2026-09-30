import { Alert, Box, Button, Stack } from '@mui/material';
import { Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { useDispatch, useSelector } from 'src/store/Store';
import { sair, usuarioAtualizado } from 'src/store/autenticacao/AutenticacaoSlice';
import { servicoAutenticacao } from 'src/servicos/autenticacao';
import { ErroApi } from 'src/utils/erroApi';
import { regras, Yup } from 'src/utils/validacao';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import LayoutAutenticacao from './LayoutAutenticacao';

const esquema = Yup.object({
  senhaAtual: Yup.string().required('Informe a senha atual').max(LIMITES.SENHA_MAXIMO),
  novaSenha: regras.senha().notOneOf([Yup.ref('senhaAtual')], 'A nova senha precisa ser diferente da atual'),
  confirmacao: Yup.string()
    .required('Repita a nova senha')
    .oneOf([Yup.ref('novaSenha')], 'As senhas não conferem'),
});

/** Troca de senha: obrigatória no primeiro acesso e disponível pelo menu do perfil. */
const TrocarSenha = () => {
  const dispatch = useDispatch();
  const navegar = useNavigate();
  const { notificar } = useInteracao();
  const obrigatoria = useSelector((s) => s.autenticacao.usuario?.trocarSenha);

  return (
    <LayoutAutenticacao
      titulo={obrigatoria ? 'Crie sua senha' : 'Trocar senha'}
      subtitulo={
        obrigatoria
          ? 'Por segurança, troque a senha provisória antes de continuar.'
          : 'Mínimo de 8 caracteres, com letras e números.'
      }
    >
      <Formik
        initialValues={{ senhaAtual: '', novaSenha: '', confirmacao: '' }}
        validationSchema={esquema}
        onSubmit={async (valores, { setStatus, setErrors }) => {
          setStatus(undefined);
          try {
            const usuario = await servicoAutenticacao.trocarSenha(valores.senhaAtual, valores.novaSenha);
            dispatch(usuarioAtualizado(usuario));
            notificar('Senha alterada.');
            navegar('/painel', { replace: true });
          } catch (e) {
            const erro = ErroApi.de(e);
            setErrors(erro.campos);
            setStatus(erro.message);
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
              <CampoFormik name="senhaAtual" rotulo="Senha atual" type="password" autoComplete="current-password" limite={LIMITES.SENHA_MAXIMO} />
              <CampoFormik name="novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" limite={LIMITES.SENHA_MAXIMO} />
              <CampoFormik name="confirmacao" rotulo="Repita a nova senha" type="password" autoComplete="new-password" limite={LIMITES.SENHA_MAXIMO} />
            </Stack>
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} mt={3}>
              {obrigatoria ? (
                <Button color="inherit" onClick={() => dispatch(sair())}>
                  Sair
                </Button>
              ) : (
                <Button color="inherit" onClick={() => navegar(-1)}>
                  Voltar
                </Button>
              )}
              <Box flexGrow={1} />
              <Button color="primary" variant="contained" size="large" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </LayoutAutenticacao>
  );
};

export default TrocarSenha;

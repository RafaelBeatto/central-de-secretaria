import { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  Theme,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { Form, Formik, FormikConfig, FormikHelpers, FormikValues } from 'formik';
import { ErroApi } from 'src/utils/erroApi';

/**
 * Diálogo de formulário padrão (antigo openModal + form):
 * - tela cheia no celular;
 * - valida com o schema Yup antes de enviar;
 * - erros do back por campo aparecem no próprio campo; os gerais, no topo.
 */
type Props<T extends FormikValues> = {
  aberto: boolean;
  titulo: string;
  valoresIniciais: T;
  esquema: FormikConfig<T>['validationSchema'];
  aoEnviar: (valores: T) => Promise<unknown>;
  aoFechar: () => void;
  rotuloSalvar?: string;
  largura?: 'xs' | 'sm' | 'md' | 'lg';
  children: ReactNode;
};

function DialogoFormulario<T extends FormikValues>({
  aberto,
  titulo,
  valoresIniciais,
  esquema,
  aoEnviar,
  aoFechar,
  rotuloSalvar = 'Salvar',
  largura = 'sm',
  children,
}: Props<T>) {
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const enviar = async (valores: T, ajudantes: FormikHelpers<T>) => {
    ajudantes.setStatus(undefined);
    try {
      await aoEnviar(esquema?.cast ? esquema.cast(valores) : valores);
      aoFechar();
    } catch (e) {
      const erro = ErroApi.de(e);
      if (Object.keys(erro.campos).length) ajudantes.setErrors(erro.campos as never);
      ajudantes.setStatus(erro.message);
    }
  };

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth={largura} fullScreen={celular} scroll="paper">
      <Formik initialValues={valoresIniciais} validationSchema={esquema} onSubmit={enviar} enableReinitialize>
        {({ isSubmitting, status }) => (
          <Form noValidate style={{ display: 'contents' }}>
            <DialogTitle sx={{ pr: 6 }}>
              {titulo}
              <IconButton aria-label="Fechar" onClick={aoFechar} sx={{ position: 'absolute', right: 12, top: 12 }}>
                <IconX size={20} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {status ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {status}
                </Alert>
              ) : null}
              {children}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={aoFechar} color="inherit">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : rotuloSalvar}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

export default DialogoFormulario;

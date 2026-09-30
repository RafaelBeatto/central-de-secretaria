import { Typography } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoUsuarios } from 'src/servicos/usuarios';
import type { UsuarioResumo } from 'src/types/acesso';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({ senhaProvisoria: regras.senha() });

/** Nova senha provisória definida pelo superior; a pessoa troca ao entrar. */
const DialogoRedefinirSenha = ({ usuario, aoFechar, aoSalvar }: { usuario: UsuarioResumo | null; aoFechar: () => void; aoSalvar: () => void }) => (
  <DialogoFormulario
    aberto={!!usuario}
    titulo={`Redefinir senha de ${usuario?.nomeCompleto ?? ''}`}
    valoresIniciais={{ senhaProvisoria: '' }}
    esquema={esquema}
    largura="xs"
    rotuloSalvar="Redefinir"
    aoFechar={aoFechar}
    aoEnviar={async ({ senhaProvisoria }) => {
      await servicoUsuarios.redefinirSenha(usuario!.id, senhaProvisoria);
      aoSalvar();
    }}
  >
    <Typography color="textSecondary">
      As sessões abertas dessa pessoa serão encerradas e ela deverá criar uma senha nova ao entrar.
    </Typography>
    <CampoFormik name="senhaProvisoria" rotulo="Senha provisória" type="password" autoComplete="new-password" obrigatorio limite={LIMITES.SENHA_MAXIMO} />
  </DialogoFormulario>
);

export default DialogoRedefinirSenha;

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import type { EscopoSerie, EventoDetalhe } from 'src/types/agenda';
import { formatarData } from 'src/utils/formatacao';

interface Props {
  evento: EventoDetalhe | null;
  aoEscolher: (escopo: EscopoSerie) => void;
  aoFechar: () => void;
}

/** Excluir um evento que se repete: só esta data, esta e as próximas, ou todas. */
const DialogoExcluirEvento = ({ evento: e, aoEscolher, aoFechar }: Props) => (
  <Dialog open={!!e} onClose={aoFechar} maxWidth="xs" fullWidth>
    <DialogTitle>Excluir evento que se repete</DialogTitle>
    {e ? (
      <DialogContent>
        <DialogContentText color="textPrimary" mb={2}>
          “{e.titulo}” se repete em {e.total} datas. O que você quer excluir?
        </DialogContentText>
        <Stack spacing={1}>
          <Button variant="outlined" onClick={() => aoEscolher('SO_ESTA')}>
            Só o de {formatarData(e.data)}
          </Button>
          {e.posicao > 1 ? (
            <Button variant="outlined" onClick={() => aoEscolher('ESTA_E_PROXIMAS')}>
              Este e os próximos ({e.restantes})
            </Button>
          ) : null}
          <Button variant="contained" color="error" onClick={() => aoEscolher('TODAS')}>
            Todas as {e.total} datas
          </Button>
        </Stack>
      </DialogContent>
    ) : null}
    <DialogActions>
      <Button color="inherit" onClick={aoFechar}>
        Cancelar
      </Button>
    </DialogActions>
  </Dialog>
);

export default DialogoExcluirEvento;

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

interface Props {
  aberto: boolean;
  titulo: string;
  dataAtual: string;
  aoMover: (data: string) => void;
  aoFechar: () => void;
}

/** "Mover para…": a alternativa ao arrastar (no celular e pelo teclado). */
const DialogoMoverPara = ({ aberto, titulo, dataAtual, aoMover, aoFechar }: Props) => {
  const [data, setData] = useState(dataAtual);
  useEffect(() => setData(dataAtual), [dataAtual, aberto]);

  return (
    <Dialog open={aberto} onClose={aoFechar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ overflowWrap: 'anywhere' }}>Mover “{titulo}”</DialogTitle>
      <DialogContent>
        <TextField type="date" label="Nova data" value={data} onChange={(e) => setData(e.target.value)} fullWidth sx={{ mt: 1 }} InputLabelProps={{ shrink: true }} />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={!data || data === dataAtual} onClick={() => aoMover(data)}>
          Mover
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoMoverPara;

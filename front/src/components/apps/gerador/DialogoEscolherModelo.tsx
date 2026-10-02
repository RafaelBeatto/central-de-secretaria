import { useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import type { ModeloDocumento } from 'src/types/gerador';
import { normalizar } from 'src/utils/formatacao';

interface Props {
  aberto: boolean;
  modelos: ModeloDocumento[];
  /** Quem receberá o documento (quando a escolha veio de outra tela). */
  para?: string | null;
  aoEscolher: (m: ModeloDocumento) => void;
  aoFechar: () => void;
}

/** "Qual documento?": modelos mais usados primeiro, com busca (old: abrirSeletorModeloGerador). */
const DialogoEscolherModelo = ({ aberto, modelos, para, aoEscolher, aoFechar }: Props) => {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const q = normalizar(busca);
    return modelos
      .filter((m) => !q || normalizar(m.nome).includes(q))
      .sort((a, b) => b.usos - a.usos || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [modelos, busca]);

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xs" TransitionProps={{ onExited: () => setBusca('') }}>
      <DialogTitle>Qual documento?</DialogTitle>
      <DialogContent>
        {para ? (
          <Typography variant="body2" color="textSecondary" mb={1.5}>
            Para: <b>{para}</b>
          </Typography>
        ) : null}
        <TextField autoFocus type="search" size="small" fullWidth placeholder="Buscar modelo…" value={busca} onChange={(e) => setBusca(e.target.value)} inputProps={{ 'aria-label': 'Buscar modelo' }} />
        <List sx={{ mt: 1 }}>
          {lista.map((m) => (
            <ListItemButton key={m.id} onClick={() => aoEscolher(m)}>
              <ListItemText primary={m.nome} secondary={m.usos ? `usado ${m.usos}×` : undefined} />
            </ListItemButton>
          ))}
          {!lista.length ? (
            <Typography color="textSecondary" py={2} textAlign="center">
              Nenhum modelo encontrado.
            </Typography>
          ) : null}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={aoFechar}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogoEscolherModelo;

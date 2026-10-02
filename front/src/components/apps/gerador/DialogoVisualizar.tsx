import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import PaginaA4Previa from './PaginaA4Previa';

interface Props {
  titulo: string;
  /** HTML da folha A4; nulo fecha o diálogo. */
  html: string | null;
  /** Versão antiga: só consulta (sem Editar). */
  somenteConsulta: boolean;
  aoEditar: () => void;
  aoImprimir: () => void;
  aoPdf: () => void;
  aoFechar: () => void;
}

/** Visualização em tamanho real, também usada para versões anteriores (old: abrirDocumentoGerado). */
const DialogoVisualizar = ({ titulo, html, somenteConsulta, aoEditar, aoImprimir, aoPdf, aoFechar }: Props) => (
  <Dialog open={html !== null} onClose={aoFechar} fullWidth maxWidth="md" scroll="paper">
    <DialogTitle sx={{ pr: 6 }}>
      {titulo}
      <IconButton aria-label="Fechar" onClick={aoFechar} sx={{ position: 'absolute', right: 12, top: 12 }}>
        <IconX size={20} />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ bgcolor: 'action.hover' }}>
      {html !== null ? <PaginaA4Previa html={html} /> : null}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>
      {somenteConsulta ? (
        <Typography variant="body2" color="textSecondary" sx={{ mr: 'auto' }}>
          Versão antiga — só para consulta.
        </Typography>
      ) : (
        <Button color="inherit" onClick={aoEditar} sx={{ mr: 'auto' }}>
          Editar
        </Button>
      )}
      <Button variant="outlined" onClick={aoImprimir}>
        Imprimir
      </Button>
      <Button variant="contained" onClick={aoPdf}>
        Salvar PDF
      </Button>
    </DialogActions>
  </Dialog>
);

export default DialogoVisualizar;

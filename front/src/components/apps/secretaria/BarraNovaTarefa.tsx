import { FormEvent, useState } from 'react';
import { Button, InputBase, Paper, Stack, TextField } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { LIMITES } from 'src/constantes/limites';
import { hojeIso } from 'src/utils/datas';

interface Props {
  aoAdicionar: (titulo: string, prazo: string) => Promise<boolean>;
  aoMaisOpcoes: (titulo: string) => void;
}

/** "O que precisa ser feito? (Enter para adicionar)" + prazo + "Mais opções". */
const BarraNovaTarefa = ({ aoAdicionar, aoMaisOpcoes }: Props) => {
  const [titulo, setTitulo] = useState('');
  const [prazo, setPrazo] = useState(hojeIso());
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = titulo.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    if (await aoAdicionar(texto, prazo || hojeIso())) setTitulo('');
    setEnviando(false);
  };

  return (
    <Paper variant="outlined" component="form" onSubmit={enviar} sx={{ p: 1.5, mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}>
          <IconPlus size={18} />
          <InputBase
            fullWidth
            placeholder="O que precisa ser feito? (Enter para adicionar)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            inputProps={{ 'aria-label': 'Nova tarefa', maxLength: LIMITES.TAREFA_TITULO }}
          />
        </Stack>
        <TextField
          type="date"
          size="small"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          inputProps={{ 'aria-label': 'Prazo' }}
        />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={!titulo.trim() || enviando}>
            Adicionar
          </Button>
          <Button color="inherit" onClick={() => aoMaisOpcoes(titulo.trim())}>
            Mais opções
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default BarraNovaTarefa;

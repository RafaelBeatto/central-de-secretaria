import { FormEvent, useState } from 'react';
import { Box, Button, Checkbox, IconButton, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { LIMITES } from 'src/constantes/limites';
import { servicoTarefas } from 'src/servicos/tarefas';
import type { Tarefa } from 'src/types/tarefas';
import { progressoSubtarefas } from 'src/utils/tarefas';

interface Props {
  tarefa: Tarefa;
  podeAlterar: boolean;
  executar: (acao: () => Promise<Tarefa>) => Promise<Tarefa | null>;
}

/** Checklist / subtarefas com barra de progresso (antigo subtarefasHTML). */
const ChecklistTarefa = ({ tarefa, podeAlterar, executar }: Props) => {
  const [texto, setTexto] = useState('');
  const prog = progressoSubtarefas(tarefa);

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo) return;
    if (await executar(() => servicoTarefas.adicionarSubtarefa(tarefa.id, limpo))) setTexto('');
  };

  return (
    <Box mt={3}>
      <Typography variant="h6" mb={1}>
        Checklist
      </Typography>
      {prog.total ? (
        <Box mb={1}>
          <Typography variant="caption" color="textSecondary">
            {prog.feitas}/{prog.total} concluídas · {prog.pct}%
          </Typography>
          <LinearProgress variant="determinate" value={prog.pct} color="success" sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">
          Nenhuma subtarefa adicionada ainda.
        </Typography>
      )}
      {tarefa.subtarefas.map((s) => (
        <Stack key={s.id} direction="row" alignItems="center">
          <Checkbox
            checked={s.feita}
            disabled={!podeAlterar}
            onChange={(e) => executar(() => servicoTarefas.marcarSubtarefa(tarefa.id, s.id, e.target.checked))}
            inputProps={{ 'aria-label': s.texto }}
          />
          <Typography flexGrow={1} sx={{ textDecoration: s.feita ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
            {s.texto}
          </Typography>
          {podeAlterar ? (
            <IconButton size="small" aria-label={`Remover ${s.texto}`} onClick={() => executar(() => servicoTarefas.removerSubtarefa(tarefa.id, s.id))}>
              <IconX size={16} />
            </IconButton>
          ) : null}
        </Stack>
      ))}
      {podeAlterar ? (
        <Stack component="form" direction="row" spacing={1} mt={1} onSubmit={adicionar}>
          <TextField
            size="small"
            fullWidth
            placeholder="Adicionar passo..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            inputProps={{ maxLength: LIMITES.SUBTAREFA_TEXTO, 'aria-label': 'Novo passo' }}
          />
          <Button type="submit" variant="outlined" disabled={!texto.trim()}>
            Adicionar
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
};

export default ChecklistTarefa;

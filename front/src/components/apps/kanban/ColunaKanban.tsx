import { FormEvent, ReactNode, useState } from 'react';
import { Box, Button, Chip, InputBase, Stack, Typography } from '@mui/material';
import { Droppable } from 'react-beautiful-dnd';
import { LIMITES } from 'src/constantes/limites';

interface Props {
  id: string;
  titulo: string;
  quantidade: number;
  corFundo: string;
  nota?: ReactNode;
  aoAdicionar?: (titulo: string) => Promise<boolean>;
  children: ReactNode;
}

/** Coluna do quadro (mesma largura e cores por situação do CategoryTaskList do template). */
const ColunaKanban = ({ id, titulo, quantidade, corFundo, nota, aoAdicionar, children }: Props) => {
  const [novo, setNovo] = useState('');

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = novo.trim();
    if (texto && aoAdicionar && (await aoAdicionar(texto))) setNovo('');
  };

  return (
    <Box width={{ xs: 260, sm: 280 }} flexShrink={0} px={2} py={2} sx={{ backgroundColor: corFundo, borderRadius: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">{titulo}</Typography>
        <Chip size="small" label={quantidade} />
      </Stack>
      {nota}
      <Droppable droppableId={id}>
        {(soltavel) => (
          <Box ref={soltavel.innerRef} {...soltavel.droppableProps} minHeight={60}>
            {children}
            {soltavel.placeholder}
          </Box>
        )}
      </Droppable>
      {aoAdicionar ? (
        <Stack component="form" direction="row" spacing={1} onSubmit={adicionar} mt={1}>
          <InputBase
            fullWidth
            placeholder="＋ Nova tarefa"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            inputProps={{ maxLength: LIMITES.TAREFA_TITULO, 'aria-label': `Nova tarefa em ${titulo}` }}
            sx={{ bgcolor: 'background.paper', px: 1, borderRadius: 1 }}
          />
          {novo.trim() ? (
            <Button type="submit" size="small" variant="contained">
              OK
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
};

export default ColunaKanban;

import { Box, Button, Stack, Typography } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import type { ItemAgenda } from 'src/types/agenda';
import { dataPorExtenso, diaSemanaLongo, hojeIso } from 'src/utils/datas';
import LinhaItem from './LinhaItem';

interface Props {
  dia: string;
  itens: ItemAgenda[];
  chaveSelecionada: string | null;
  podeCriar: boolean;
  podeMarcar: (i: ItemAgenda) => boolean;
  aoNovo: () => void;
  aoAbrir: (i: ItemAgenda) => void;
  aoMarcar: (i: ItemAgenda) => void;
}

/** Painel com o dia escolhido: tudo o que tem nele e o botão "+ Evento". */
const PainelDia = ({ dia, itens, chaveSelecionada, podeCriar, podeMarcar, aoNovo, aoAbrir, aoMarcar }: Props) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={2}>
      <Box>
        <Typography variant="caption" color="textSecondary">
          {dia === hojeIso() ? 'Hoje · ' : ''}
          {diaSemanaLongo(dia)}
        </Typography>
        <Typography variant="h5">{dataPorExtenso(dia)}</Typography>
      </Box>
      {podeCriar ? (
        <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={aoNovo}>
          Evento
        </Button>
      ) : null}
    </Stack>
    {itens.length ? (
      itens.map((i) => (
        <LinhaItem key={i.chave} item={i} selecionado={i.chave === chaveSelecionada} podeMarcar={podeMarcar(i)} aoMarcar={() => aoMarcar(i)} aoAbrir={() => aoAbrir(i)} />
      ))
    ) : (
      <Typography color="textSecondary">Nada marcado para este dia.</Typography>
    )}
  </Box>
);

export default PainelDia;

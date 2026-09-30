import { Box, Checkbox, Stack, Typography } from '@mui/material';
import type { ItemAgenda } from 'src/types/agenda';
import { ROTULO_TIPO_EVENTO } from 'src/types/agenda';
import { grupoOrigem, horario, marcaOrigem } from 'src/utils/agenda';
import { COR_ORIGEM } from './cores';

interface Props {
  item: ItemAgenda;
  selecionado: boolean;
  /** Evento/tarefa que o usuário pode marcar como feito. */
  podeMarcar: boolean;
  aoMarcar: () => void;
  aoAbrir: () => void;
}

const ORIGEM_TEXTO = { TAREFA: 'Tarefa da Secretaria', DOCUMENTO: 'Documento', PROJETO: 'Projeto' } as const;

/** Linha da Lista e do painel do dia: marcar como feito + horário, título e detalhes. */
const LinhaItem = ({ item: i, selecionado, podeMarcar, aoMarcar, aoAbrir }: Props) => {
  const cor = COR_ORIGEM[grupoOrigem(i)];
  const marcavel = i.origem === 'EVENTO' || i.origem === 'TAREFA';
  const tipo = i.origem === 'EVENTO' ? (i.tipoEvento ? ROTULO_TIPO_EVENTO[i.tipoEvento] : '') : ORIGEM_TEXTO[i.origem];
  const meta = [i.local, i.responsavel, tipo].filter(Boolean).join(' · ');

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={1}
      sx={{
        borderLeft: '3px solid',
        borderColor: `${cor}.main`,
        bgcolor: selecionado ? `${cor}.light` : 'transparent',
        borderRadius: 1,
        py: 0.5,
        pr: 1,
        mb: 0.75,
        opacity: i.concluido ? 0.6 : 1,
      }}
    >
      {marcavel ? (
        <Checkbox
          size="small"
          checked={i.concluido}
          disabled={!podeMarcar}
          onChange={aoMarcar}
          inputProps={{ 'aria-label': `${i.concluido ? 'Reabrir' : 'Marcar como feito'}: ${i.titulo}` }}
          sx={{ mt: -0.25 }}
        />
      ) : (
        <Box width={38} textAlign="center" pt={0.5} aria-hidden>
          {marcaOrigem(i)}
        </Box>
      )}
      <Box
        component="button"
        type="button"
        onClick={aoAbrir}
        sx={{ flexGrow: 1, minWidth: 0, textAlign: 'left', font: 'inherit', color: 'inherit', bgcolor: 'transparent', border: 0, p: 0, pt: 0.5, cursor: 'pointer' }}
      >
        <Typography variant="caption" color="textSecondary" display="block">
          {horario(i) || 'Dia todo'}
        </Typography>
        <Typography variant="subtitle2" sx={{ textDecoration: i.concluido ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
          {i.titulo}
        </Typography>
        {meta ? (
          <Typography variant="caption" color="textSecondary" display="block" sx={{ overflowWrap: 'anywhere' }}>
            {meta}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
};

export default LinhaItem;

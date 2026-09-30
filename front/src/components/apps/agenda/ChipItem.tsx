import { Box, Typography } from '@mui/material';
import type { ItemAgenda } from 'src/types/agenda';
import { grupoOrigem, hora, marcaOrigem } from 'src/utils/agenda';
import { COR_ORIGEM, TIPO_ARRASTE } from './cores';

interface Props {
  item: ItemAgenda;
  selecionado: boolean;
  podeArrastar: boolean;
  compacto?: boolean;
  aoAbrir: () => void;
}

/** Item dentro de um dia da Semana ou do Mês. */
const ChipItem = ({ item: i, selecionado, podeArrastar, compacto, aoAbrir }: Props) => {
  const cor = COR_ORIGEM[grupoOrigem(i)];
  const alta = i.origem === 'EVENTO' && !i.concluido && (i.prioridade === 'ALTA' || i.prioridade === 'URGENTE');
  const marca = marcaOrigem(i);

  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        aoAbrir();
      }}
      draggable={podeArrastar}
      onDragStart={(e) => {
        e.dataTransfer.setData(TIPO_ARRASTE, i.chave);
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={`${i.titulo}${i.local ? ` · ${i.local}` : ''}`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        border: 0,
        borderLeft: '3px solid',
        borderColor: `${cor}.main`,
        bgcolor: `${cor}.light`,
        color: 'text.primary',
        borderRadius: 1,
        px: 0.75,
        py: compacto ? 0.25 : 0.5,
        mb: 0.5,
        cursor: podeArrastar ? 'grab' : 'pointer',
        opacity: i.concluido ? 0.55 : 1,
        outline: selecionado ? '2px solid' : 'none',
        outlineColor: `${cor}.main`,
        '&:hover': { filter: 'brightness(0.97)' },
      }}
    >
      <Typography
        variant="caption"
        component="span"
        display="block"
        noWrap={compacto}
        sx={{ textDecoration: i.concluido ? 'line-through' : 'none', overflowWrap: 'anywhere', lineHeight: 1.35 }}
      >
        {i.horarioInicio ? <b>{hora(i.horarioInicio)} </b> : null}
        {marca ? `${marca} ` : null}
        {alta ? (
          <Box component="b" color="error.main" aria-label="prioridade alta">
            !{' '}
          </Box>
        ) : null}
        {i.titulo}
      </Typography>
      {!compacto && i.local ? (
        <Typography variant="caption" component="span" display="block" color="textSecondary" noWrap>
          {i.local}
        </Typography>
      ) : null}
    </Box>
  );
};

export default ChipItem;

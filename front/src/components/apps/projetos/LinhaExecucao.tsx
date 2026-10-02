import { Box, ListItemButton, Stack, Typography } from '@mui/material';
import type { ExecucaoResumo } from 'src/types/projetos';
import { formatarMoeda } from 'src/utils/projetos';
import { ChipStatus, EtapasMini } from './Comuns';

/** Execução na lista: nome, próximo passo, situação, planejado, pago, saldo e etapas. */
const LinhaExecucao = ({ execucao: e, aoAbrir, mostrarSaldo }: { execucao: ExecucaoResumo; aoAbrir: () => void; mostrarSaldo?: boolean }) => {
  const s = e.situacao;
  const numeros = [
    ['Planejado', s.planejado],
    ['Pago', s.pago],
    ...(mostrarSaldo ? [['Saldo', s.saldo] as const] : []),
  ] as const;
  return (
    <ListItemButton onClick={aoAbrir} sx={{ borderRadius: 1, py: 1, px: 1.5, opacity: e.status === 'CANCELADO' ? 0.6 : 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 2 }} alignItems={{ md: 'center' }} width="100%">
        <Box flexGrow={1} minWidth={0}>
          <Typography variant="subtitle1" fontWeight={500} noWrap>
            {e.nome}
          </Typography>
          <Typography variant="caption" color={s.proximoPasso ? 'textSecondary' : 'success.main'} noWrap display="block">
            {s.proximoPasso ? `Próximo passo: ${s.proximoPasso.rotulo}` : '✓ Todas as etapas registradas'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center" flexShrink={0} flexWrap="wrap" useFlexGap>
          <ChipStatus status={e.status} />
          {numeros.map(([rotulo, valor]) => (
            <Box key={rotulo} textAlign="right" minWidth={90}>
              <Typography variant="caption" color="textSecondary" display="block">
                {rotulo}
              </Typography>
              <Typography variant="body2" color={valor < 0 ? 'error.main' : 'textPrimary'}>
                {formatarMoeda(valor)}
              </Typography>
            </Box>
          ))}
          <EtapasMini situacao={s} />
        </Stack>
      </Stack>
    </ListItemButton>
  );
};

export default LinhaExecucao;

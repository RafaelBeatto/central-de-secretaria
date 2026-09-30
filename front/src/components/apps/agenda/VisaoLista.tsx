import { Box, Typography } from '@mui/material';
import { dataPorExtenso, diaSemanaLongo, diasEntre, hojeIso, somarDias } from 'src/utils/datas';
import LinhaItem from './LinhaItem';
import type { PropsVisao } from './visoes';

/** Próximos 30 dias a partir da referência, só os dias que têm alguma coisa. */
const VisaoLista = ({ porDia, inicio, fim, chaveSelecionada, podeMarcar, aoEscolherDia, aoAbrir, aoMarcar, vazio }: PropsVisao & { vazio: string }) => {
  const hoje = hojeIso();
  const dias = Array.from({ length: diasEntre(inicio, fim) + 1 }, (_, n) => somarDias(inicio, n)).filter((iso) => porDia[iso]?.length);
  if (!dias.length) {
    return (
      <Typography color="textSecondary" py={4} textAlign="center">
        {vazio}
      </Typography>
    );
  }
  return (
    <Box className="agenda-calendario">
      {dias.map((iso) => (
        <Box key={iso} mb={2}>
          <Box
            component="button"
            type="button"
            onClick={() => aoEscolherDia(iso)}
            sx={{ display: 'flex', gap: 1, alignItems: 'baseline', font: 'inherit', color: 'inherit', bgcolor: 'transparent', border: 0, p: 0, mb: 0.75, cursor: 'pointer' }}
          >
            <Typography variant="subtitle1" fontWeight={700} color={iso === hoje ? 'primary.main' : 'textPrimary'}>
              {dataPorExtenso(iso)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {iso === hoje ? 'Hoje' : diaSemanaLongo(iso)}
            </Typography>
          </Box>
          {porDia[iso].map((i) => (
            <LinhaItem key={i.chave} item={i} selecionado={i.chave === chaveSelecionada} podeMarcar={podeMarcar(i)} aoMarcar={() => aoMarcar(i)} aoAbrir={() => aoAbrir(i)} />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default VisaoLista;

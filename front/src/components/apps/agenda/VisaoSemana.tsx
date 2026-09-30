import { Box, Typography } from '@mui/material';
import { diaSemanaCurto, doIso, hojeIso, somarDias } from 'src/utils/datas';
import ChipItem from './ChipItem';
import DiaAlvo from './DiaAlvo';
import type { PropsVisao } from './visoes';

/** Sete colunas de segunda a domingo (no celular, um dia embaixo do outro). */
const VisaoSemana = ({ porDia, inicio, diaEscolhido, chaveSelecionada, podeArrastar, aoEscolherDia, aoAbrir, aoSoltar }: PropsVisao) => {
  const hoje = hojeIso();
  return (
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(7, minmax(0, 1fr))' }} gap={1} className="agenda-calendario">
      {Array.from({ length: 7 }, (_, n) => {
        const iso = somarDias(inicio, n);
        const itens = porDia[iso] ?? [];
        const fimDeSemana = doIso(iso).getDay() % 6 === 0;
        return (
          <DiaAlvo
            key={iso}
            iso={iso}
            aoEscolher={aoEscolherDia}
            aoSoltar={aoSoltar}
            sx={{
              border: '1px solid',
              borderColor: iso === hoje ? 'primary.main' : 'divider',
              borderRadius: 1,
              bgcolor: iso === diaEscolhido ? 'action.selected' : fimDeSemana ? 'action.hover' : 'background.paper',
              minHeight: { xs: 56, md: 260 },
              p: 0.75,
              minWidth: 0,
            }}
          >
            <Box display="flex" alignItems="baseline" gap={0.75} mb={0.75}>
              <Typography variant="caption" color="textSecondary" textTransform="uppercase">
                {diaSemanaCurto(iso)}
              </Typography>
              <Typography variant="h6" color={iso === hoje ? 'primary.main' : 'textPrimary'}>
                {doIso(iso).getDate()}
              </Typography>
            </Box>
            {itens.map((i) => (
              <ChipItem key={i.chave} item={i} selecionado={i.chave === chaveSelecionada} podeArrastar={podeArrastar(i)} aoAbrir={() => aoAbrir(i)} />
            ))}
          </DiaAlvo>
        );
      })}
    </Box>
  );
};

export default VisaoSemana;

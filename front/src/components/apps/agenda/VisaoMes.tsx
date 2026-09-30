import { Box, Typography } from '@mui/material';
import type { GrupoOrigem } from 'src/types/agenda';
import { grupoOrigem } from 'src/utils/agenda';
import { diasEntre, doIso, hojeIso, somarDias } from 'src/utils/datas';
import ChipItem from './ChipItem';
import DiaAlvo from './DiaAlvo';
import { COR_ORIGEM } from './cores';
import type { PropsVisao } from './visoes';

const CABECALHO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const MAXIMO_POR_DIA = 3;

/** Grade do mês: até 3 itens por dia e "+N"; no celular, só os pontos coloridos. */
const VisaoMes = ({ porDia, inicio, fim, referencia, diaEscolhido, chaveSelecionada, podeArrastar, aoEscolherDia, aoAbrir, aoSoltar }: PropsVisao) => {
  const hoje = hojeIso();
  const mes = doIso(referencia).getMonth();
  const total = diasEntre(inicio, fim) + 1;

  return (
    <Box className="agenda-calendario">
      <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={0.5} mb={0.5}>
        {CABECALHO.map((d) => (
          <Typography key={d} variant="caption" color="textSecondary" textAlign="center" textTransform="uppercase">
            {d}
          </Typography>
        ))}
      </Box>
      <Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap={0.5}>
        {Array.from({ length: total }, (_, n) => {
          const iso = somarDias(inicio, n);
          const itens = porDia[iso] ?? [];
          const fora = doIso(iso).getMonth() !== mes;
          const origens = [...new Set(itens.map(grupoOrigem))] as GrupoOrigem[];
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
                bgcolor: iso === diaEscolhido ? 'action.selected' : 'background.paper',
                opacity: fora ? 0.55 : 1,
                minHeight: { xs: 52, md: 112 },
                p: 0.5,
                minWidth: 0,
              }}
            >
              <Typography variant="caption" fontWeight={iso === hoje ? 700 : 400} color={iso === hoje ? 'primary.main' : 'textPrimary'}>
                {doIso(iso).getDate()}
              </Typography>
              <Box display={{ xs: 'none', md: 'block' }}>
                {itens.slice(0, MAXIMO_POR_DIA).map((i) => (
                  <ChipItem key={i.chave} item={i} compacto selecionado={i.chave === chaveSelecionada} podeArrastar={podeArrastar(i)} aoAbrir={() => aoAbrir(i)} />
                ))}
                {itens.length > MAXIMO_POR_DIA ? (
                  <Typography variant="caption" color="textSecondary">
                    +{itens.length - MAXIMO_POR_DIA}
                  </Typography>
                ) : null}
              </Box>
              {itens.length ? (
                <Box display="flex" gap={0.5} mt={0.25} aria-label={`${itens.length} item(ns)`}>
                  {origens.map((o) => (
                    <Box key={o} width={7} height={7} borderRadius="50%" bgcolor={`${COR_ORIGEM[o]}.main`} />
                  ))}
                </Box>
              ) : null}
            </DiaAlvo>
          );
        })}
      </Box>
    </Box>
  );
};

export default VisaoMes;

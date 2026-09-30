import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import type { AtendimentoResposta } from 'src/types/atendimentos';
import { diaSemanaCurto, hojeIso, somarDias } from 'src/utils/datas';
import { efetivo } from 'src/utils/atendimentos';

interface Props {
  segunda: string;
  porDia: Record<string, AtendimentoResposta[]>;
  diaEscolhido: string | 'semana';
  aoEscolher: (dia: string | 'semana') => void;
}

/** Faixa com os 7 dias da semana (sáb/dom só aparecem se tiverem atendimento) + "Semana" (old: atDiasHTML). */
const FaixaDias = ({ segunda, porDia, diaEscolhido, aoEscolher }: Props) => {
  const hoje = hojeIso();
  const todasAsDatas = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const datas = todasAsDatas.filter((d, i) => i < 5 || (porDia[d]?.length ?? 0) > 0);

  const Botao = ({ ativo, hoje: ehHoje, children, onClick }: { ativo: boolean; hoje?: boolean; children: React.ReactNode; onClick: () => void }) => (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        flexDirection: 'column',
        borderRadius: 2,
        py: 1,
        border: '1px solid',
        borderColor: ativo ? 'primary.main' : 'divider',
        bgcolor: ativo ? 'primary.light' : ehHoje ? 'action.hover' : 'transparent',
        gap: 0.25,
      }}
    >
      {children}
    </ButtonBase>
  );

  return (
    <Stack direction="row" spacing={1} mb={2}>
      {datas.map((d) => {
        const doDia = (porDia[d] ?? []).filter(efetivo);
        const pendente = d <= hoje && doDia.some((a) => a.presenca === 'NAO_INFORMADO');
        return (
          <Botao key={d} ativo={diaEscolhido === d} hoje={d === hoje} onClick={() => aoEscolher(d)}>
            <Typography variant="caption" color="textSecondary">
              {d === hoje ? 'hoje' : diaSemanaCurto(d)}
            </Typography>
            <Typography variant="h6" component="div">
              {Number(d.slice(8, 10))}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {doDia.length || '—'}
              {pendente ? (
                <Box component="span" ml={0.5} display="inline-block" width={6} height={6} borderRadius="50%" bgcolor="warning.main" />
              ) : null}
            </Typography>
          </Botao>
        );
      })}
      <Botao ativo={diaEscolhido === 'semana'} onClick={() => aoEscolher('semana')}>
        <Typography variant="caption" color="textSecondary">
          ver
        </Typography>
        <Typography variant="h6" component="div">
          Semana
        </Typography>
        <Typography variant="caption" color="textSecondary">
          toda
        </Typography>
      </Botao>
    </Stack>
  );
};

export default FaixaDias;

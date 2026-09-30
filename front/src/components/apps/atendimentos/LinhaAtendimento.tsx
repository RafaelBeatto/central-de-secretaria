import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { AtendimentoResposta } from 'src/types/atendimentos';
import { formatarData } from 'src/utils/formatacao';
import { hojeIso } from 'src/utils/datas';

interface Props {
  atendimento: AtendimentoResposta;
  selecionado: boolean;
  podeAlterar: boolean;
  aoAbrir: () => void;
  aoMarcar: (presenca: 'VEIO' | 'FALTOU') => void;
}

/** Uma linha da lista do dia/semana, com presença em um clique (old: atLinhaHTML). */
const LinhaAtendimento = ({ atendimento: a, selecionado, podeAlterar, aoAbrir, aoMarcar }: Props) => {
  if (a.remarcado) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center" py={1} px={1.5} sx={{ opacity: 0.65, bgcolor: selecionado ? 'action.selected' : undefined, borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" minWidth={48}>
          {a.horario}
        </Typography>
        <ButtonBase onClick={aoAbrir} sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ textDecoration: 'line-through' }}>
              {a.alunoNome}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Remarcado para {formatarData(a.remarcadoParaData).slice(0, 5)} às {a.remarcadoParaHorario}
              {a.remarcadoParaProfissionalNome && a.remarcadoParaProfissionalNome !== a.profissionalNome ? ` com ${a.remarcadoParaProfissionalNome}` : ''}
            </Typography>
          </Box>
        </ButtonBase>
      </Stack>
    );
  }

  const futuro = a.data > hojeIso();
  const notas = [a.remarcadoDeId ? 'remarcado' : null, a.serieId ? '↻ semanal' : null, a.presenca === 'FALTOU' ? a.faltaMotivo : null, a.observacao]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      py={1}
      px={1.5}
      sx={{ bgcolor: selecionado ? 'action.selected' : undefined, borderRadius: 1 }}
    >
      <Typography variant="body2" color="textSecondary" minWidth={48}>
        {a.horario}
      </Typography>
      <ButtonBase onClick={aoAbrir} sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left' }}>
        <Box minWidth={0}>
          <Typography variant="subtitle2" noWrap>
            {a.alunoNome}
          </Typography>
          <Typography variant="caption" color="textSecondary" noWrap component="div">
            {a.profissionalNome}
            {notas ? ` · ${notas}` : ''}
          </Typography>
        </Box>
      </ButtonBase>
      <Stack direction="row" spacing={0.5}>
        <Chip
          size="small"
          icon={<IconCheck size={14} />}
          label="Veio"
          color={a.presenca === 'VEIO' ? 'success' : 'default'}
          variant={a.presenca === 'VEIO' ? 'filled' : 'outlined'}
          disabled={!podeAlterar || futuro}
          onClick={() => aoMarcar('VEIO')}
        />
        <Chip
          size="small"
          icon={<IconX size={14} />}
          label="Faltou"
          color={a.presenca === 'FALTOU' ? 'error' : 'default'}
          variant={a.presenca === 'FALTOU' ? 'filled' : 'outlined'}
          disabled={!podeAlterar}
          onClick={() => aoMarcar('FALTOU')}
        />
      </Stack>
    </Stack>
  );
};

export default LinhaAtendimento;

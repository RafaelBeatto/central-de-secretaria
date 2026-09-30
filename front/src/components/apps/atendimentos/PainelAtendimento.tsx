import { Box, Button, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import type { AtendimentoResposta } from 'src/types/atendimentos';
import { ROTULO_MOTIVO_FALTA } from 'src/types/atendimentos';
import { diaSemanaLongo } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';

interface Props {
  atendimento: AtendimentoResposta;
  podeAlterar: boolean;
  aoVoltar: () => void;
  aoAbrirAluno: () => void;
  aoAbrirProfissional: () => void;
  aoAbrirOutroAtendimento: (id: number) => void;
  aoRemarcar: () => void;
  aoExcluir: () => void;
  aoEncerrarSerie: () => void;
}

const Fato = ({ titulo, children }: { titulo: string; children: React.ReactNode }) =>
  children ? (
    <Box mb={1.5}>
      <Typography variant="caption" color="textSecondary" component="div">
        {titulo}
      </Typography>
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </Box>
  ) : null;

/** Detalhe do atendimento: fatos, remarcação, série e exclusão (old: atPainelHTML). */
const PainelAtendimento = ({
  atendimento: a,
  podeAlterar,
  aoVoltar,
  aoAbrirAluno,
  aoAbrirProfissional,
  aoAbrirOutroAtendimento,
  aoRemarcar,
  aoExcluir,
  aoEncerrarSerie,
}: Props) => {
  const rotuloPresenca = a.remarcado ? 'Remarcado' : { NAO_INFORMADO: 'Sem registro', VEIO: '✓ Veio', FALTOU: '✕ Faltou' }[a.presenca];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoVoltar} sx={{ display: { md: 'none' } }}>
          Atendimentos
        </Button>
        <Box flex={1} />
        <IconButton size="small" aria-label="Fechar" onClick={aoVoltar}>
          <IconX size={18} />
        </IconButton>
      </Stack>

      <Typography variant="overline" color="textSecondary">
        Atendimento
      </Typography>
      <Typography variant="h5">
        <Link component="button" underline="hover" onClick={aoAbrirAluno} color="inherit">
          {a.alunoNome}
        </Link>
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        com{' '}
        <Link component="button" underline="hover" onClick={aoAbrirProfissional}>
          {a.profissionalNome}
        </Link>
      </Typography>

      {podeAlterar ? (
        <Stack direction="row" spacing={1} mb={2}>
          {!a.remarcado ? (
            <Button size="small" variant="outlined" onClick={aoRemarcar}>
              Remarcar
            </Button>
          ) : null}
          <Button size="small" variant="outlined" color="error" onClick={aoExcluir}>
            Excluir
          </Button>
        </Stack>
      ) : null}

      <Fato titulo="Quando">
        {diaSemanaLongo(a.data)}, {formatarData(a.data)} às {a.horario}
      </Fato>
      <Fato titulo="Presença">{rotuloPresenca}</Fato>
      {a.presenca === 'FALTOU' ? (
        <Fato titulo="Motivo da falta">
          {[a.faltaMotivo ? ROTULO_MOTIVO_FALTA[a.faltaMotivo] : null, a.faltaObservacao].filter(Boolean).join(' — ') || 'Não informado'}
        </Fato>
      ) : null}
      <Fato titulo="Observação">{a.observacao}</Fato>
      {a.remarcado ? (
        <Fato titulo="Remarcado para">
          {a.remarcadoParaId ? (
            <Link component="button" underline="hover" onClick={() => aoAbrirOutroAtendimento(a.remarcadoParaId as number)}>
              {formatarData(a.remarcadoParaData)} às {a.remarcadoParaHorario} →
            </Link>
          ) : (
            `${formatarData(a.remarcadoParaData)} às ${a.remarcadoParaHorario}`
          )}
          {a.remarcadoMotivo ? (
            <Typography variant="caption" component="div" color="textSecondary">
              {a.remarcadoMotivo}
            </Typography>
          ) : null}
        </Fato>
      ) : null}
      {a.remarcadoDeId ? (
        <Fato titulo="Remarcado de">
          <Link component="button" underline="hover" onClick={() => aoAbrirOutroAtendimento(a.remarcadoDeId as number)}>
            {formatarData(a.remarcadoDeData)} às {a.remarcadoDeHorario} →
          </Link>
        </Fato>
      ) : null}
      {a.serieId ? (
        <Fato titulo="Repetição">Toda semana · {a.restantesNaSerie} atendimento(s) daqui em diante</Fato>
      ) : null}

      {podeAlterar && a.serieId && a.restantesNaSerie > 1 ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" mb={1}>
            O aluno saiu ou mudou de horário?
          </Typography>
          <Button size="small" variant="outlined" color="error" onClick={aoEncerrarSerie}>
            Encerrar a partir de {formatarData(a.data).slice(0, 5)} ({a.restantesNaSerie})
          </Button>
        </>
      ) : null}
    </Box>
  );
};

export default PainelAtendimento;

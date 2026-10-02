import { ReactNode } from 'react';
import { Box, Button, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { IconPaperclip } from '@tabler/icons-react';
import { servicoArquivos } from 'src/servicos/arquivos';
import { FinanceiroRecurso, ROTULO_STATUS_EXECUCAO, ROTULO_STATUS_RECURSO, SituacaoExecucao, StatusExecucao, StatusRecurso } from 'src/types/projetos';
import { formatarMoeda, TOM_STATUS } from 'src/utils/projetos';

/** Pequenos blocos reaproveitados pelas telas de projetos (old/js/04b-projetos-telas.js). */

export const ChipStatus = ({ status }: { status: StatusRecurso | StatusExecucao }) => (
  <Chip size="small" color={TOM_STATUS[status]} label={(ROTULO_STATUS_RECURSO as Record<string, string>)[status] ?? ROTULO_STATUS_EXECUCAO[status as StatusExecucao]} />
);

/** "3/7" com barrinha: quantas etapas do checklist já estão registradas. */
export const EtapasMini = ({ situacao }: { situacao: SituacaoExecucao }) => (
  <Box minWidth={70} title={`${situacao.etapasFeitas} de ${situacao.etapas.length} etapas registradas`}>
    <LinearProgress variant="determinate" value={(situacao.etapasFeitas / situacao.etapas.length) * 100} sx={{ height: 6, borderRadius: 3 }} />
    <Typography variant="caption" color="textSecondary">
      {situacao.etapasFeitas}/{situacao.etapas.length}
    </Typography>
  </Box>
);

/** Números grandes do topo (Recebido, Distribuído, Pago, Disponível…). */
export const Numeros = ({ itens }: { itens: { rotulo: string; valor: number; nota?: string; destaque?: boolean }[] }) => (
  <Grid container spacing={2}>
    {itens.map((i) => (
      <Grid item xs={6} md={3} key={i.rotulo}>
        <Typography variant="caption" color="textSecondary" display="block">
          {i.rotulo}
        </Typography>
        <Typography variant="h6" color={i.destaque ? 'primary.main' : i.valor < 0 ? 'error.main' : 'textPrimary'}>
          {formatarMoeda(i.valor)}
        </Typography>
        {i.nota ? (
          <Typography variant="caption" color="textSecondary">
            {i.nota}
          </Typography>
        ) : null}
      </Grid>
    ))}
  </Grid>
);

/** Medidor do recurso: pago | distribuído a pagar | livre para distribuir (um só tom, do escuro ao claro). */
export const MedidorRecurso = ({ f }: { f: FinanceiroRecurso }) => {
  const base = Math.max(f.recebido, f.distribuido, 0.01);
  const aPagar = Math.max(0, f.distribuido - f.pago);
  const livre = Math.max(0, f.naoDistribuido);
  const partes = [
    { rotulo: 'Pago', valor: Math.max(0, f.pago), cor: 'primary.dark' },
    { rotulo: 'Distribuído a pagar', valor: aPagar, cor: 'primary.main' },
    { rotulo: 'Livre para distribuir', valor: livre, cor: 'primary.light' },
  ];
  return (
    <Box mt={1.5}>
      <Box
        display="flex"
        height={10}
        borderRadius={5}
        overflow="hidden"
        bgcolor="grey.200"
        role="img"
        aria-label={partes.map((p) => `${p.rotulo} ${formatarMoeda(p.valor)}`).join('; ')}
      >
        {partes.map((p) => (p.valor > 0 ? <Box key={p.rotulo} bgcolor={p.cor} flexBasis={`${(p.valor / base) * 100}%`} /> : null))}
      </Box>
      <Stack direction="row" spacing={2} mt={0.5} flexWrap="wrap" useFlexGap>
        {partes.map((p) => (
          <Typography key={p.rotulo} variant="caption" color="textSecondary" display="flex" alignItems="center" gap={0.5}>
            <Box component="span" width={10} height={10} borderRadius="50%" bgcolor={p.cor} display="inline-block" />
            {p.rotulo} <strong>{formatarMoeda(p.valor)}</strong>
          </Typography>
        ))}
      </Stack>
      {f.naoDistribuido < -0.005 ? (
        <Typography variant="caption" color="error.main">
          Distribuído acima do valor recebido em {formatarMoeda(-f.naoDistribuido)}.
        </Typography>
      ) : null}
    </Box>
  );
};

/** Cabeçalho de seção: título, explicação e ações à direita. */
export const CabecalhoSecao = ({ titulo, texto, acoes }: { titulo: string; texto?: ReactNode; acoes?: ReactNode }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1} mb={2}>
    <Box>
      <Typography variant="h6">{titulo}</Typography>
      {texto ? (
        <Typography variant="body2" color="textSecondary">
          {texto}
        </Typography>
      ) : null}
    </Box>
    {acoes ? (
      <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" useFlexGap>
        {acoes}
      </Stack>
    ) : null}
  </Stack>
);

export const Vazio = ({ children }: { children: ReactNode }) => (
  <Box py={4} px={2} textAlign="center" border={1} borderColor="divider" borderRadius={1} sx={{ borderStyle: 'dashed' }}>
    <Typography color="textSecondary">{children}</Typography>
  </Box>
);

export const BotaoArquivo = ({ arquivoId, rotulo = 'Abrir' }: { arquivoId: number | null; rotulo?: string }) =>
  arquivoId ? (
    <Button size="small" startIcon={<IconPaperclip size={16} />} onClick={() => servicoArquivos.abrir(arquivoId)}>
      {rotulo}
    </Button>
  ) : null;

/** Linha de item (documento, pagamento, pendência…): texto à esquerda, ações à direita. */
export const LinhaItem = ({ titulo, detalhe, acoes, apagado }: { titulo: ReactNode; detalhe?: ReactNode; acoes?: ReactNode; apagado?: boolean }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    justifyContent="space-between"
    alignItems={{ sm: 'center' }}
    spacing={1}
    py={1.25}
    borderBottom={1}
    borderColor="divider"
    sx={{ opacity: apagado ? 0.6 : 1 }}
  >
    <Box minWidth={0}>
      <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere', textDecoration: apagado ? 'line-through' : 'none' }}>
        {titulo}
      </Typography>
      {detalhe ? (
        <Typography variant="caption" color="textSecondary" component="div">
          {detalhe}
        </Typography>
      ) : null}
    </Box>
    {acoes ? (
      <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
        {acoes}
      </Stack>
    ) : null}
  </Stack>
);

import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import { RecursoResumo } from 'src/types/projetos';
import { formatarMoeda } from 'src/utils/projetos';
import { ChipStatus, MedidorRecurso, Numeros, Vazio } from './Comuns';
import LinhaExecucao from './LinhaExecucao';

interface Props {
  recursos: RecursoResumo[];
  /** Total sem filtros: decide entre "comece cadastrando" e "nada com esses filtros". */
  total: number;
  podeAlterar: boolean;
  aoAbrirRecurso: (id: number) => void;
  aoAbrirExecucao: (id: number) => void;
  aoNovoRecurso: () => void;
  aoNovaExecucao: (r: RecursoResumo) => void;
}

/** Nível 1: totais e um cartão por recurso com as execuções dele (old: pjListaCorpoHTML). */
const ListaRecursos = ({ recursos, total, podeAlterar, aoAbrirRecurso, aoAbrirExecucao, aoNovoRecurso, aoNovaExecucao }: Props) => {
  if (!total) {
    return (
      <Box textAlign="center" py={6} maxWidth={620} mx="auto">
        <Typography variant="h6">Comece cadastrando um recurso</Typography>
        <Typography color="textSecondary" mb={2}>
          Um <strong>recurso</strong> é o dinheiro que entrou na APAE — convênio, emenda, doação. Dentro dele você cria as{' '}
          <strong>execuções</strong>: cada aplicação específica desse dinheiro, com cotações, compras, documentos e pagamentos.
        </Typography>
        {podeAlterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={aoNovoRecurso}>
            Cadastrar o primeiro recurso
          </Button>
        ) : null}
      </Box>
    );
  }

  const ativos = recursos.filter((r) => !r.arquivado);
  const soma = (k: 'recebido' | 'distribuido' | 'pago' | 'disponivel') => ativos.reduce((t, r) => t + r.financeiro[k], 0);

  return (
    <Stack spacing={3}>
      <Numeros
        itens={[
          { rotulo: 'Recebido', valor: soma('recebido') },
          { rotulo: 'Distribuído', valor: soma('distribuido') },
          { rotulo: 'Pago', valor: soma('pago') },
          { rotulo: 'Disponível', valor: soma('disponivel'), destaque: true },
        ]}
      />
      {!recursos.length ? <Vazio>Nada encontrado com esses filtros.</Vazio> : null}
      {recursos.map((r) => (
        <BlankCard key={r.id}>
          <Box p={{ xs: 2, md: 3 }} sx={{ opacity: r.arquivado ? 0.75 : 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <Box component="button" type="button" onClick={() => aoAbrirRecurso(r.id)} sx={{ all: 'unset', cursor: 'pointer', minWidth: 0, '&:focus-visible': { outline: 2, outlineColor: 'primary.main' } }}>
                <Typography variant="caption" color="textSecondary">
                  {r.codigo} · Recurso{r.arquivado ? ' · arquivado' : ''}
                </Typography>
                <Typography variant="h5" sx={{ overflowWrap: 'anywhere', '&:hover': { color: 'primary.main' } }}>
                  {r.nome}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {[r.fonteRecurso, r.orgaoRepassador, `${r.execucoes.length} execuç${r.execucoes.length === 1 ? 'ão' : 'ões'}`].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              <Box textAlign={{ sm: 'right' }} flexShrink={0}>
                <Typography variant="caption" color="textSecondary" display="block">
                  Recebido
                </Typography>
                <Typography variant="h6">{formatarMoeda(r.financeiro.recebido)}</Typography>
                <Stack direction="row" spacing={1} justifyContent={{ sm: 'flex-end' }}>
                  <ChipStatus status={r.status} />
                  {r.arquivado ? <Chip size="small" label="Arquivado" /> : null}
                </Stack>
              </Box>
            </Stack>
            <MedidorRecurso f={r.financeiro} />
            <Box mt={2}>
              {r.execucoes.map((e) => (
                <LinhaExecucao key={e.id} execucao={e} aoAbrir={() => aoAbrirExecucao(e.id)} />
              ))}
              {!r.execucoes.length ? (
                <Typography variant="body2" color="textSecondary" px={1.5}>
                  Nenhuma execução ainda.
                </Typography>
              ) : null}
              {podeAlterar && !r.arquivado ? (
                <Button size="small" startIcon={<IconPlus size={16} />} onClick={() => aoNovaExecucao(r)} sx={{ mt: 1 }}>
                  Nova execução
                </Button>
              ) : null}
            </Box>
          </Box>
        </BlankCard>
      ))}
    </Stack>
  );
};

export default ListaRecursos;

import { Box, Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Tarefa } from 'src/types/tarefas';
import { GRUPOS_TAREFA, GrupoTarefa, grupoDaTarefa, ordenarTarefas } from 'src/utils/tarefas';
import LinhaTarefa from './LinhaTarefa';

interface Props {
  tarefas: Tarefa[];
  encerradas: Tarefa[] | null;
  verEncerradas: boolean;
  aoAlternarEncerradas: () => void;
  selecionadaId: number | null;
  podeAlterar: boolean;
  temFiltro: boolean;
  aoAbrir: (t: Tarefa) => void;
  aoMarcar: (t: Tarefa, grupo: GrupoTarefa) => void;
}

/** Tarefas separadas pelo que importa no dia (Atrasadas, Hoje, Próximos 7 dias…). */
const ListaTarefas = ({ tarefas, encerradas, verEncerradas, aoAlternarEncerradas, selecionadaId, podeAlterar, temFiltro, aoAbrir, aoMarcar }: Props) => {
  const grupos = new Map<GrupoTarefa, Tarefa[]>();
  tarefas.forEach((t) => {
    const g = grupoDaTarefa(t);
    // As encerradas de outros dias vêm da consulta separada (seção recolhida).
    if (g !== 'concluidas') grupos.set(g, [...(grupos.get(g) ?? []), t]);
  });

  if (!tarefas.length && !temFiltro && encerradas !== null && !encerradas.length) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6">Nenhuma tarefa ainda</Typography>
        <Typography color="textSecondary">
          Escreva acima o que precisa ser feito e aperte Enter. Para algo que se repete — como enviar recado aos pais
          toda sexta — use “Mais opções”.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {GRUPOS_TAREFA.filter(([g]) => g !== 'concluidas').map(([grupo, rotulo]) => {
        const itens = (grupos.get(grupo) ?? []).sort(ordenarTarefas);
        if (!itens.length) return null;
        const abertas = itens.filter((t) => !t.feitaHoje).length;
        const feitas = itens.length - abertas;
        return (
          <Box key={grupo} component="section" aria-label={rotulo}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6" color={grupo === 'atrasadas' ? 'error.main' : 'textPrimary'}>
                {rotulo}
              </Typography>
              <Chip size="small" label={abertas} color={grupo === 'atrasadas' ? 'error' : 'default'} />
              {feitas ? (
                <Typography variant="caption" color="textSecondary">
                  {feitas} feita{feitas === 1 ? '' : 's'}
                </Typography>
              ) : null}
            </Stack>
            {itens.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                grupo={grupo}
                selecionada={selecionadaId === t.id}
                podeAlterar={podeAlterar}
                aoAbrir={() => aoAbrir(t)}
                aoMarcar={() => aoMarcar(t, grupo)}
              />
            ))}
          </Box>
        );
      })}

      {!tarefas.length && temFiltro ? (
        <Typography color="textSecondary">Nenhuma tarefa com esses filtros.</Typography>
      ) : null}

      <Box component="section" aria-label="Concluídas e canceladas">
        <Button
          color="inherit"
          onClick={aoAlternarEncerradas}
          startIcon={verEncerradas ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          aria-expanded={verEncerradas}
        >
          Concluídas e canceladas
        </Button>
        {verEncerradas ? (
          encerradas === null ? (
            <LinearProgress />
          ) : encerradas.length ? (
            encerradas.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                grupo="concluidas"
                selecionada={selecionadaId === t.id}
                podeAlterar={podeAlterar}
                aoAbrir={() => aoAbrir(t)}
                aoMarcar={() => aoMarcar(t, 'concluidas')}
              />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary" px={1}>
              Nenhuma ainda.
            </Typography>
          )
        ) : null}
      </Box>
    </Stack>
  );
};

export default ListaTarefas;

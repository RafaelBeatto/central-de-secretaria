import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import type { Documento } from 'src/types/documentos';
import { ChaveSituacao, GRUPOS_DOCUMENTO, ordenarDocumentos, situacaoValidade } from 'src/utils/documentos';
import LinhaDocumento from './LinhaDocumento';

interface Props {
  documentos: Documento[];
  /** Total sem filtros: decide entre "nenhum ainda" e "nenhum com esses filtros". */
  total: number;
  selecionadoId: number | null;
  podeAlterar: boolean;
  aoAbrir: (d: Documento) => void;
  aoRenovar: (d: Documento) => void;
  aoNovo: () => void;
}

const COR_GRUPO: Partial<Record<ChaveSituacao, 'error' | 'warning'>> = { vencido: 'error', vencendo: 'warning' };

/** Documentos separados pelo que exige ação: vencidos, vencendo em 30 dias, em dia e sem validade. */
const ListaDocumentos = ({ documentos, total, selecionadoId, podeAlterar, aoAbrir, aoRenovar, aoNovo }: Props) => {
  if (!total) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6">Nenhum documento ainda</Typography>
        <Typography color="textSecondary" mb={2}>
          Cadastre certidões, atas, contratos e outros documentos da APAE. Quando um documento tiver validade, ele aparece
          aqui na hora certa de renovar.
        </Typography>
        {podeAlterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={aoNovo}>
            Cadastrar documento
          </Button>
        ) : null}
      </Box>
    );
  }
  if (!documentos.length) return <Typography color="textSecondary">Nenhum documento com esses filtros.</Typography>;

  const grupos = new Map<ChaveSituacao, Documento[]>();
  documentos.forEach((d) => {
    const g = situacaoValidade(d.dataValidade);
    grupos.set(g, [...(grupos.get(g) ?? []), d]);
  });

  return (
    <Stack spacing={3}>
      {GRUPOS_DOCUMENTO.map(([grupo, rotulo]) => {
        const itens = (grupos.get(grupo) ?? []).sort(ordenarDocumentos(grupo));
        if (!itens.length) return null;
        return (
          <Box key={grupo} component="section" aria-label={rotulo}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="h6" color={COR_GRUPO[grupo] ? `${COR_GRUPO[grupo]}.main` : 'textPrimary'}>
                {rotulo}
              </Typography>
              <Chip size="small" label={itens.length} color={COR_GRUPO[grupo] ?? 'default'} />
            </Stack>
            {itens.map((d) => (
              <LinhaDocumento
                key={d.id}
                documento={d}
                selecionado={selecionadoId === d.id}
                podeAlterar={podeAlterar}
                aoAbrir={() => aoAbrir(d)}
                aoRenovar={() => aoRenovar(d)}
              />
            ))}
          </Box>
        );
      })}
    </Stack>
  );
};

export default ListaDocumentos;

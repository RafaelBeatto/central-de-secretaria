import { useMemo } from 'react';
import { Box, Button, Chip, ListItemButton, Stack, Typography } from '@mui/material';
import { IconLink, IconPaperclip, IconPlus } from '@tabler/icons-react';
import type { DocumentoGeradoItem } from 'src/types/gerador';
import { doIso, MESES } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';
import { nomeDocumento, resumoDocumento } from 'src/utils/gerador';

interface Props {
  documentos: DocumentoGeradoItem[];
  total: number;
  /** Modelos que têm documento, para os filtros em chips. */
  filtroModelo: number | null;
  aoFiltrarModelo: (id: number | null) => void;
  selecionadoId: number | null;
  podeAlterar: boolean;
  aoAbrir: (d: DocumentoGeradoItem) => void;
  aoNovo: () => void;
}

const tituloMes = (iso: string) => {
  const d = doIso(iso);
  return `${MESES[d.getMonth()].charAt(0).toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`;
};

/** Documentos gerados, agrupados por mês (old: geDocumentosHTML). */
const ListaDocumentosGerados = ({ documentos, total, filtroModelo, aoFiltrarModelo, selecionadoId, podeAlterar, aoAbrir, aoNovo }: Props) => {
  const grupos = useMemo(() => {
    const mapa = new Map<string, DocumentoGeradoItem[]>();
    documentos.forEach((d) => {
      const mes = d.dataGeracao.slice(0, 7);
      mapa.set(mes, [...(mapa.get(mes) ?? []), d]);
    });
    return [...mapa.entries()];
  }, [documentos]);

  if (!total) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6">Nenhum documento gerado ainda</Typography>
        <Typography color="textSecondary" mb={2}>
          Escolha um modelo — ofício, declaração, recibo, ata… — preencha os campos e o documento sai com o cabeçalho da instituição, pronto para imprimir ou salvar em PDF.
        </Typography>
        {podeAlterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={aoNovo}>
            Novo documento
          </Button>
        ) : null}
      </Box>
    );
  }

  return (
    <>
      {grupos.length ? (
        grupos.map(([mes, itens]) => (
          <Box key={mes} mb={2}>
            <Typography variant="subtitle2" color="textSecondary" mb={0.5}>
              {tituloMes(`${mes}-01`)} · {itens.length}
            </Typography>
            {itens.map((d) => (
              <ListItemButton
                key={d.id}
                selected={selecionadoId === d.id}
                onClick={() => aoAbrir(d)}
                sx={{ borderRadius: 1, border: 1, borderColor: 'divider', mb: 0.75, alignItems: 'flex-start', gap: 1 }}
              >
                <Box flexGrow={1} minWidth={0}>
                  <Typography fontWeight={600} noWrap>
                    {nomeDocumento(d)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ overflowWrap: 'anywhere' }}>
                    {resumoDocumento(d) || d.modeloNome}
                    {d.vinculoRotulo ? (
                      <>
                        {' · '}
                        <IconLink size={12} style={{ verticalAlign: 'middle' }} /> {d.vinculoRotulo}
                      </>
                    ) : null}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
                  {d.totalAnexos ? (
                    <Typography variant="caption" color="textSecondary" title="Anexos">
                      <IconPaperclip size={12} style={{ verticalAlign: 'middle' }} /> {d.totalAnexos}
                    </Typography>
                  ) : null}
                  {d.versao > 1 ? <Chip size="small" label={`v${d.versao}`} /> : null}
                  <Typography variant="caption" color="textSecondary">
                    {formatarData(d.dataGeracao).slice(0, 5)}
                  </Typography>
                </Stack>
              </ListItemButton>
            ))}
          </Box>
        ))
      ) : (
        <Typography color="textSecondary" textAlign="center" py={4}>
          Nenhum documento com esses filtros.
        </Typography>
      )}
      {filtroModelo !== null && !grupos.length ? (
        <Box textAlign="center">
          <Button onClick={() => aoFiltrarModelo(null)}>Limpar filtro de modelo</Button>
        </Box>
      ) : null}
    </>
  );
};

export default ListaDocumentosGerados;

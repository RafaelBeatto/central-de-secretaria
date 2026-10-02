import { Box, Button, ListItemButton, Stack, Typography } from '@mui/material';
import { IconPaperclip } from '@tabler/icons-react';
import { Documento, ROTULO_CATEGORIA_DOCUMENTO } from 'src/types/documentos';
import { prazoTexto, situacaoValidade, TOM_SITUACAO } from 'src/utils/documentos';
import { formatarData } from 'src/utils/formatacao';

interface Props {
  documento: Documento;
  selecionado: boolean;
  podeAlterar: boolean;
  aoAbrir: () => void;
  aoRenovar: () => void;
}

const COR_TEXTO = { error: 'error.main', warning: 'warning.main', success: 'success.main', default: 'text.secondary' } as const;

/** Linha da lista: nome (📎 se tem arquivo), categoria/órgão/número/responsável, prazo e "Renovar". */
const LinhaDocumento = ({ documento: d, selecionado, podeAlterar, aoAbrir, aoRenovar }: Props) => {
  const situacao = situacaoValidade(d.dataValidade);
  const precisa = situacao === 'vencido' || situacao === 'vencendo';
  const meta = [ROTULO_CATEGORIA_DOCUMENTO[d.categoria], d.orgao, d.numero && `Nº ${d.numero}`, d.responsavel].filter(Boolean).join(' · ');

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <ListItemButton selected={selecionado} onClick={aoAbrir} sx={{ borderRadius: 1, py: 1, px: 1.5, minWidth: 0 }}>
        <Box flexGrow={1} minWidth={0}>
          <Typography variant="subtitle1" fontWeight={500} noWrap display="flex" alignItems="center" gap={0.5}>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.nome}
            </Box>
            {d.arquivoId ? <IconPaperclip size={14} aria-label="Tem arquivo" style={{ flexShrink: 0 }} /> : null}
          </Typography>
          {meta ? (
            <Typography variant="caption" color="textSecondary" noWrap display="block">
              {meta}
            </Typography>
          ) : null}
        </Box>
        <Box textAlign="right" flexShrink={0} ml={1}>
          <Typography variant="body2" color={COR_TEXTO[TOM_SITUACAO[situacao]]} fontWeight={precisa ? 600 : 400}>
            {prazoTexto(d.dataValidade)}
          </Typography>
          {d.dataValidade && situacao !== 'valido' ? (
            <Typography variant="caption" color="textSecondary">
              {formatarData(d.dataValidade)}
            </Typography>
          ) : null}
        </Box>
      </ListItemButton>
      {podeAlterar && precisa ? (
        <Button size="small" variant={situacao === 'vencido' ? 'contained' : 'outlined'} onClick={aoRenovar} sx={{ flexShrink: 0 }}>
          Renovar
        </Button>
      ) : null}
    </Stack>
  );
};

export default LinhaDocumento;

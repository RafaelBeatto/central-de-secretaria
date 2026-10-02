import { Box, Chip, ListItemButton, Typography } from '@mui/material';
import type { Empresa } from 'src/types/empresas';
import { situacaoEmpresa } from 'src/utils/documentos';

interface Props {
  empresa: Empresa;
  selecionada: boolean;
  aoAbrir: () => void;
}

/** Linha da lista: razão social, CNPJ/telefone/representante e a situação da documentação. */
const LinhaEmpresa = ({ empresa: e, selecionada, aoAbrir }: Props) => {
  const situacao = situacaoEmpresa(e);
  const meta = [e.cnpj && `CNPJ ${e.cnpj}`, e.telefone, e.representante && `Rep.: ${e.representante}`].filter(Boolean).join(' · ');

  return (
    <ListItemButton selected={selecionada} onClick={aoAbrir} sx={{ borderRadius: 1, py: 1, px: 1.5, gap: 1 }}>
      <Box flexGrow={1} minWidth={0}>
        <Typography variant="subtitle1" fontWeight={500} noWrap>
          {e.razaoSocial}
        </Typography>
        <Typography variant="caption" color="textSecondary" noWrap display="block">
          {meta || 'Sem dados adicionais'}
        </Typography>
      </Box>
      <Chip size="small" color={situacao.tom} label={situacao.rotulo} sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }} />
      <Box
        role="img"
        aria-label={situacao.rotulo}
        sx={{ display: { xs: 'block', sm: 'none' }, width: 10, height: 10, borderRadius: '50%', bgcolor: `${situacao.tom}.main`, flexShrink: 0 }}
      />
    </ListItemButton>
  );
};

export default LinhaEmpresa;

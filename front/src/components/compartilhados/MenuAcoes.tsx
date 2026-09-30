import { useState } from 'react';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { IconDotsVertical } from '@tabler/icons-react';

/** Menu "⋮" de ações de uma linha (funciona igual no celular e no computador). */
export interface Acao {
  rotulo: string;
  icone?: JSX.Element;
  aoClicar: () => void;
  perigo?: boolean;
  oculta?: boolean;
}

const MenuAcoes = ({ acoes, rotulo = 'Ações' }: { acoes: Acao[]; rotulo?: string }) => {
  const [ancora, setAncora] = useState<HTMLElement | null>(null);
  const visiveis = acoes.filter((a) => !a.oculta);
  if (!visiveis.length) return null;

  return (
    <>
      <IconButton aria-label={rotulo} onClick={(e) => setAncora(e.currentTarget)} size="small">
        <IconDotsVertical size={18} />
      </IconButton>
      <Menu anchorEl={ancora} open={Boolean(ancora)} onClose={() => setAncora(null)}>
        {visiveis.map((acao) => (
          <MenuItem
            key={acao.rotulo}
            onClick={() => {
              setAncora(null);
              acao.aoClicar();
            }}
            sx={acao.perigo ? { color: 'error.main' } : undefined}
          >
            {acao.icone ? <ListItemIcon sx={{ color: 'inherit' }}>{acao.icone}</ListItemIcon> : null}
            {acao.rotulo}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default MenuAcoes;

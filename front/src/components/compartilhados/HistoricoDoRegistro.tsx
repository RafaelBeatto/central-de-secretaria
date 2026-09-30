import { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Typography } from '@mui/material';
import type { HistoricoRegistro } from 'src/types/comum';
import { formatarDataHora } from 'src/utils/formatacao';

/**
 * "Histórico" no fim do painel de detalhe de qualquer registro.
 * "versao" força recarregar depois de uma alteração.
 */
const HistoricoDoRegistro = ({ carregar, versao }: { carregar: () => Promise<HistoricoRegistro[]>; versao?: unknown }) => {
  const [itens, setItens] = useState<HistoricoRegistro[] | null>(null);

  useEffect(() => {
    let ativo = true;
    carregar()
      .then((lista) => ativo && setItens(lista))
      .catch(() => ativo && setItens([]));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  return (
    <>
      <Typography variant="h6" mt={3} mb={1}>
        Histórico
      </Typography>
      {itens && !itens.length ? (
        <Typography variant="body2" color="textSecondary">
          Sem registros ainda.
        </Typography>
      ) : (
        <List dense disablePadding>
          {(itens ?? []).map((item) => (
            <ListItem key={item.id} disableGutters alignItems="flex-start">
              <ListItemText
                primary={item.descricao}
                secondary={`${formatarDataHora(item.criadoEm)}${item.usuarioNome ? ` · ${item.usuarioNome}` : ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
};

export default HistoricoDoRegistro;

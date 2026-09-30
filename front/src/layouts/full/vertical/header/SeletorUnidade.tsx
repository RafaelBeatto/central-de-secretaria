import { useEffect } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'src/store/Store';
import { carregarUnidades, visualizarUnidade } from 'src/store/autenticacao/AutenticacaoSlice';

/**
 * "Visualizando": aparece só para quem tem unidades subordinadas.
 * Escolher outra unidade mostra os dados dela em modo somente leitura.
 */
const SeletorUnidade = () => {
  const dispatch = useDispatch();
  const { usuario, unidades, unidadeVisualizadaId } = useSelector((s) => s.autenticacao);

  useEffect(() => {
    if (usuario) dispatch(carregarUnidades());
  }, [dispatch, usuario]);

  if (!usuario || unidades.length < 2) return null;

  return (
    <TextField
      select
      size="small"
      label="Visualizando"
      value={unidadeVisualizadaId ?? usuario.unidade.id}
      onChange={(e) => dispatch(visualizarUnidade(Number(e.target.value)))}
      sx={{ minWidth: { xs: 150, sm: 260 }, maxWidth: { xs: 170, sm: 360 } }}
    >
      {unidades.map((unidade) => (
        <MenuItem key={unidade.id} value={unidade.id} sx={{ pl: 2 + unidade.profundidade * 2 }}>
          {unidade.nome}
          {unidade.id === usuario.unidade.id ? ' (minha)' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default SeletorUnidade;

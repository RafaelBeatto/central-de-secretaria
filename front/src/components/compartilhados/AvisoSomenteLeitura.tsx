import { Alert, Button } from '@mui/material';
import { useDispatch, useSelector } from 'src/store/Store';
import { visualizarUnidade } from 'src/store/autenticacao/AutenticacaoSlice';

/** Faixa exibida quando o usuário está consultando uma unidade subordinada. */
const AvisoSomenteLeitura = () => {
  const dispatch = useDispatch();
  const { unidades, unidadeVisualizadaId } = useSelector((s) => s.autenticacao);
  if (unidadeVisualizadaId === null) return null;
  const nome = unidades.find((u) => u.id === unidadeVisualizadaId)?.nome ?? 'outra unidade';

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <Button color="inherit" size="small" onClick={() => dispatch(visualizarUnidade(null))}>
          Voltar à minha
        </Button>
      }
    >
      Consultando <strong>{nome}</strong> — somente leitura.
    </Alert>
  );
};

export default AvisoSomenteLeitura;

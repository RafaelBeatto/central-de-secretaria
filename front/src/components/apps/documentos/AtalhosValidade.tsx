import { Button, Stack } from '@mui/material';
import { useFormikContext } from 'formik';
import { VALIDADES_RAPIDAS, validadeRapida } from 'src/utils/documentos';

/** "+30 dias", "+90 dias", "+6 meses", "+1 ano" contados da emissão (ou de hoje). */
const AtalhosValidade = ({ campoEmissao, campoValidade }: { campoEmissao: string; campoValidade: string }) => {
  const { values, setFieldValue } = useFormikContext<Record<string, string>>();
  return (
    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
      {VALIDADES_RAPIDAS.map(([rotulo, dias]) => (
        <Button
          key={dias}
          size="small"
          variant="text"
          sx={{ minWidth: 0, px: 1 }}
          onClick={() => setFieldValue(campoValidade, validadeRapida(values[campoEmissao], dias))}
        >
          +{rotulo}
        </Button>
      ))}
    </Stack>
  );
};

export default AtalhosValidade;

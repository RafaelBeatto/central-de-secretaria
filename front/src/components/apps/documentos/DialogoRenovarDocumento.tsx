import { Alert, Grid } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CampoArquivoFormik from 'src/components/formularios/CampoArquivoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoDocumentos } from 'src/servicos/documentos';
import type { Documento, RequisicaoRenovarDocumento } from 'src/types/documentos';
import { hojeIso } from 'src/utils/datas';
import { formatarData } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';
import AtalhosValidade from './AtalhosValidade';

const esquema = Yup.object({
  dataEmissao: Yup.string().required('Informe a nova emissão'),
  dataValidade: Yup.string()
    .required('Informe a nova validade')
    .test('depois-da-emissao', 'A validade não pode ser antes da emissão.', (v, ctx) => !v || !ctx.parent.dataEmissao || v >= ctx.parent.dataEmissao),
  numero: regras.texto(LIMITES.DOCUMENTO_NUMERO),
});

interface Props {
  documento: Documento | null;
  aoFechar: () => void;
  aoRenovar: (d: Documento) => void;
}

/**
 * Renovar = o mesmo documento com nova emissão/validade/arquivo; a versão anterior
 * (com o arquivo dela) vai para "Versões anteriores" (old: abrirFormRenovarDocumento).
 */
const DialogoRenovarDocumento = ({ documento: d, aoFechar, aoRenovar }: Props) => {
  const valoresIniciais: RequisicaoRenovarDocumento = { dataEmissao: hojeIso(), dataValidade: '', numero: d?.numero ?? '', arquivoId: null };

  return (
    <DialogoFormulario
      aberto={!!d}
      titulo={d ? `Renovar: ${d.nome}` : 'Renovar'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      rotuloSalvar="Renovar"
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        if (d) aoRenovar(await servicoDocumentos.renovar(d.id, valores));
      }}
    >
      {d ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          Validade atual: <strong>{d.dataValidade ? formatarData(d.dataValidade) : 'sem validade'}</strong>
          {d.arquivoId ? ' · o arquivo atual vai para “Versões anteriores”.' : '.'}
        </Alert>
      ) : null}
      <Grid container columnSpacing={3}>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataEmissao" rotulo="Nova emissão" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataValidade" rotulo="Nova validade" obrigatorio type="date" />
          <AtalhosValidade campoEmissao="dataEmissao" campoValidade="dataValidade" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="numero" rotulo="Número" limite={LIMITES.DOCUMENTO_NUMERO} />
        </Grid>
        <Grid item xs={12}>
          <CampoArquivoFormik name="arquivoId" rotulo="Novo arquivo" categoria="DOCUMENTO" />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default DialogoRenovarDocumento;

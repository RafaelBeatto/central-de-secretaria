import { Grid } from '@mui/material';
import { useFormikContext } from 'formik';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { ROTULO_TIPO_RELATORIO, TipoRelatorio } from 'src/types/relatoriosProfissionais';

const OPCOES_TIPO = (Object.keys(ROTULO_TIPO_RELATORIO) as TipoRelatorio[]).map((t) => ({ valor: t, rotulo: ROTULO_TIPO_RELATORIO[t] }));

/** Só relatório pessoal pede o nome do aluno. */
const CampoAluno = () => {
  const { values } = useFormikContext<{ tipo: TipoRelatorio }>();
  return values.tipo === 'PESSOAL' ? (
    <Grid item xs={12}>
      <CampoFormik name="nomeAluno" rotulo="Nome do aluno" obrigatorio limite={LIMITES.RELATORIO_PROF_ALUNO} />
    </Grid>
  ) : null;
};

/** Nome, tipo (Pessoal sugerido), aluno e complemento do relatório. Deve ficar dentro de um `Grid container`. */
const CamposRelatorio = () => (
  <>
    <Grid item xs={12}>
      <CampoFormik name="nome" rotulo="Nome do relatório" obrigatorio limite={LIMITES.RELATORIO_PROF_TITULO} />
    </Grid>
    <Grid item xs={12}>
      <CampoFormik name="tipo" rotulo="Tipo de relatório" obrigatorio opcoes={OPCOES_TIPO} />
    </Grid>
    <CampoAluno />
    <Grid item xs={12}>
      <CampoFormik
        name="complemento"
        rotulo="Complemento (opcional)"
        multiline
        minRows={2}
        limite={LIMITES.RELATORIO_PROF_COMPLEMENTO}
        helperText="Explique do que se trata o relatório."
      />
    </Grid>
  </>
);

export default CamposRelatorio;

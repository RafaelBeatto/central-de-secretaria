import { Alert, Grid, Typography } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CampoArquivoFormik from 'src/components/formularios/CampoArquivoFormik';
import { ACEITA } from 'src/servicos/arquivos';
import { servicoRelatoriosProfissionais } from 'src/servicos/relatoriosProfissionais';
import type { RelatorioProfissional, RequisicaoRelatorioProfissional } from 'src/types/relatoriosProfissionais';
import { Yup } from 'src/utils/validacao';
import { esquemaDescricaoRelatorio } from 'src/utils/relatoriosProfissionais';
import CamposRelatorio from './CamposRelatorio';

const esquemaPeriodoEArquivo = {
  periodoInicio: Yup.string(),
  periodoFim: Yup.string().test('depois-do-inicio', 'O fim do período não pode ser antes do início.', (v, ctx) => !v || !ctx.parent.periodoInicio || v >= ctx.parent.periodoInicio),
  arquivoId: Yup.number().nullable().required('Escolha o PDF do relatório'),
};
const esquemaNovo = Yup.object({ ...esquemaDescricaoRelatorio, ...esquemaPeriodoEArquivo });
const esquemaEntrega = Yup.object(esquemaPeriodoEArquivo);

const valoresIniciais: RequisicaoRelatorioProfissional = { nome: '', tipo: 'PESSOAL', nomeAluno: '', complemento: '', periodoInicio: '', periodoFim: '', arquivoId: null };

interface Props {
  aberto: boolean;
  /** Cobrança a atender: o nome, o tipo e o complemento já vêm definidos pela Central. */
  pendente?: RelatorioProfissional | null;
  aoFechar: () => void;
  aoEnviar: (r: RelatorioProfissional) => void;
}

/** Enviar o PDF do relatório (feito fora do sistema), novo ou em resposta a uma cobrança. O período é opcional. */
const DialogoEnviarRelatorio = ({ aberto, pendente, aoFechar, aoEnviar }: Props) => (
  <DialogoFormulario
    aberto={aberto}
    titulo={pendente ? `Enviar: ${pendente.nome}` : 'Enviar relatório'}
    valoresIniciais={valoresIniciais}
    esquema={pendente ? esquemaEntrega : esquemaNovo}
    rotuloSalvar="Enviar"
    aoFechar={aoFechar}
    aoEnviar={async (v) =>
      aoEnviar(
        pendente
          ? await servicoRelatoriosProfissionais.entregar(pendente.id, v)
          : await servicoRelatoriosProfissionais.enviar(v),
      )
    }
  >
    <Grid container columnSpacing={3}>
      {pendente ? (
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mb: 1 }}>
            <strong>{pendente.nome}</strong>
            {pendente.nomeAluno ? ` · Aluno: ${pendente.nomeAluno}` : ''}
            {pendente.complemento ? (
              <Typography variant="body2" component="div">
                {pendente.complemento}
              </Typography>
            ) : null}
          </Alert>
        </Grid>
      ) : (
        <CamposRelatorio />
      )}
      <Grid item xs={12} sm={6}>
        <CampoFormik name="periodoInicio" rotulo="Período: de (opcional)" type="date" InputLabelProps={{ shrink: true }} helperText="Sem data, vale a de hoje." />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="periodoFim" rotulo="Período: até (opcional)" type="date" InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={12}>
        <CampoArquivoFormik
          name="arquivoId"
          rotulo="Relatório em PDF"
          categoria="RELATORIO_PROFISSIONAL"
          aceita={ACEITA.pdf}
          dica="Somente PDF."
          restrito
          obrigatorio
        />
      </Grid>
    </Grid>
  </DialogoFormulario>
);

export default DialogoEnviarRelatorio;

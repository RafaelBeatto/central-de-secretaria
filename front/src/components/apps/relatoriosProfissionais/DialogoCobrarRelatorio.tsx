import { Alert, Grid } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import { servicoRelatoriosProfissionais } from 'src/servicos/relatoriosProfissionais';
import type { ProfissionalCentral, RelatorioProfissional, RequisicaoCobrancaRelatorio } from 'src/types/relatoriosProfissionais';
import { Yup } from 'src/utils/validacao';
import { esquemaDescricaoRelatorio } from 'src/utils/relatoriosProfissionais';
import CamposRelatorio from './CamposRelatorio';

const esquema = Yup.object(esquemaDescricaoRelatorio);
const valoresIniciais: RequisicaoCobrancaRelatorio = { nome: '', tipo: 'PESSOAL', nomeAluno: '', complemento: '' };

interface Props {
  profissional: ProfissionalCentral | null;
  aoFechar: () => void;
  aoCobrar: (r: RelatorioProfissional) => void;
}

/** Central: pede a um professor/profissional que produza um relatório; ele aparece como Pendente em "Meus Relatórios" dele. */
const DialogoCobrarRelatorio = ({ profissional, aoFechar, aoCobrar }: Props) => (
  <DialogoFormulario
    aberto={!!profissional}
    titulo={profissional ? `Cobrar relatório de ${profissional.nome}` : 'Cobrar relatório'}
    valoresIniciais={valoresIniciais}
    esquema={esquema}
    rotuloSalvar="Cobrar"
    aoFechar={aoFechar}
    aoEnviar={async (v) => profissional && aoCobrar(await servicoRelatoriosProfissionais.cobrar(profissional.usuarioId, v))}
  >
    <Alert severity="info" sx={{ mb: 1 }}>
      O relatório fica <strong>Pendente</strong> para {profissional?.nome ?? 'o profissional'} até ele enviar o PDF.
    </Alert>
    <Grid container columnSpacing={3}>
      <CamposRelatorio />
    </Grid>
  </DialogoFormulario>
);

export default DialogoCobrarRelatorio;

import { Grid, Typography } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { Yup } from 'src/utils/validacao';
import { LIMITES } from 'src/constantes/limites';
import type { AtendimentoResposta, ProfissionalAtendimento } from 'src/types/atendimentos';

const esquema = Yup.object({
  data: Yup.string().required(),
  horario: Yup.string().required(),
  profissionalId: Yup.number().required(),
  motivo: Yup.string().trim().max(LIMITES.ATENDIMENTO_REMARCADO_MOTIVO),
});

interface Valores {
  data: string;
  horario: string;
  profissionalId: number | '';
  motivo: string;
}

interface Props {
  atendimento: AtendimentoResposta | null;
  profissionais: ProfissionalAtendimento[];
  podeEscolherProfissional: boolean;
  aoFechar: () => void;
  aoConfirmar: (valores: Valores) => Promise<unknown>;
}

/** Nova data/horário/profissional; o original fica no histórico como "remarcado" (old: abrirModalRemarcar). */
const DialogoRemarcar = ({ atendimento, profissionais, podeEscolherProfissional, aoFechar, aoConfirmar }: Props) => (
  <DialogoFormulario<Valores>
    aberto={!!atendimento}
    titulo={`Remarcar: ${atendimento?.alunoNome ?? ''}`}
    valoresIniciais={{
      data: atendimento?.data ?? '',
      horario: atendimento?.horario ?? '',
      profissionalId: atendimento?.profissionalId ?? '',
      motivo: '',
    }}
    esquema={esquema}
    aoFechar={aoFechar}
    rotuloSalvar="Remarcar"
    aoEnviar={aoConfirmar}
  >
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <CampoFormik name="data" rotulo="Nova data" type="date" obrigatorio InputLabelProps={{ shrink: true }} />
      </Grid>
      <Grid item xs={6}>
        <CampoFormik name="horario" rotulo="Novo horário" type="time" obrigatorio InputLabelProps={{ shrink: true }} />
      </Grid>
      {podeEscolherProfissional ? (
        <Grid item xs={12}>
          <CampoFormik
            name="profissionalId"
            rotulo="Profissional"
            opcoes={profissionais.map((p) => ({ valor: p.id, rotulo: p.nome }))}
          />
        </Grid>
      ) : null}
      <Grid item xs={12}>
        <CampoFormik name="motivo" rotulo="Motivo" limite={LIMITES.ATENDIMENTO_REMARCADO_MOTIVO} placeholder="Ex.: profissional em curso" />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="caption" color="textSecondary">
          O atendimento original fica no histórico como &quot;remarcado&quot;.
        </Typography>
      </Grid>
    </Grid>
  </DialogoFormulario>
);

export default DialogoRemarcar;

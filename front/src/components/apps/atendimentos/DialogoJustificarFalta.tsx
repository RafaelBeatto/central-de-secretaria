import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { Yup } from 'src/utils/validacao';
import { LIMITES } from 'src/constantes/limites';
import type { AtendimentoResposta, MotivoFalta } from 'src/types/atendimentos';
import { ROTULO_MOTIVO_FALTA } from 'src/types/atendimentos';

const OPCOES_MOTIVO = (Object.keys(ROTULO_MOTIVO_FALTA) as MotivoFalta[]).map((valor) => ({ valor, rotulo: ROTULO_MOTIVO_FALTA[valor] }));

const esquema = Yup.object({
  faltaMotivo: Yup.string().required(),
  faltaObservacao: Yup.string().trim().max(LIMITES.OBSERVACAO_CURTA),
});

interface Props {
  atendimento: AtendimentoResposta | null;
  aoFechar: () => void;
  aoConfirmar: (motivo: MotivoFalta, observacao: string) => Promise<unknown>;
}

/** Motivo da falta antes de marcar "Faltou" (old: abrirJustificativaFalta). */
const DialogoJustificarFalta = ({ atendimento, aoFechar, aoConfirmar }: Props) => (
  <DialogoFormulario
    aberto={!!atendimento}
    titulo={`Falta: ${atendimento?.alunoNome ?? ''}`}
    valoresIniciais={{ faltaMotivo: atendimento?.faltaMotivo ?? 'DOENCA', faltaObservacao: atendimento?.faltaObservacao ?? '' }}
    esquema={esquema}
    aoFechar={aoFechar}
    rotuloSalvar="Registrar falta"
    aoEnviar={(v) => aoConfirmar(v.faltaMotivo as MotivoFalta, v.faltaObservacao)}
  >
    <CampoFormik name="faltaMotivo" rotulo="Motivo" opcoes={OPCOES_MOTIVO} sx={{ mb: 2 }} />
    <CampoFormik name="faltaObservacao" rotulo="Observação (opcional)" limite={LIMITES.OBSERVACAO_CURTA} multiline minRows={2} />
  </DialogoFormulario>
);

export default DialogoJustificarFalta;

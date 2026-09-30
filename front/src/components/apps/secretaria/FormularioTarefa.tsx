import { Grid } from '@mui/material';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoTarefas } from 'src/servicos/tarefas';
import { ROTULO_PRIORIDADE, Prioridade } from 'src/types/comum';
import type { RequisicaoTarefa, SugestoesTarefa, Tarefa } from 'src/types/tarefas';
import { NOMES_DIAS, hojeIso } from 'src/utils/datas';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  titulo: regras.obrigatorio(LIMITES.TAREFA_TITULO),
  prazo: Yup.string().required('Informe a data'),
  responsavel: regras.texto(LIMITES.RESPONSAVEL),
  categoria: regras.texto(LIMITES.TAREFA_CATEGORIA),
  descricao: regras.texto(LIMITES.TEXTO_LONGO),
  diaMes: Yup.number().min(1).max(31),
});

const OPCOES_REPETE = [
  { valor: '', rotulo: 'Não, é uma vez só' },
  { valor: 'DIARIA', rotulo: 'Diária' },
  { valor: 'SEMANAL', rotulo: 'Semanal' },
  { valor: 'MENSAL', rotulo: 'Mensal' },
  { valor: 'ANUAL', rotulo: 'Anual' },
];
const OPCOES_PRIORIDADE = (Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => ({ valor: p, rotulo: ROTULO_PRIORIDADE[p] }));

/** Campos que mudam conforme a repetição escolhida (como no formulário antigo). */
const CamposRepeticao = () => {
  const { values } = useFormikContext<RequisicaoTarefa>();
  return (
    <>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="prazo" rotulo={values.frequencia ? 'Primeira vez' : 'Prazo'} obrigatorio type="date" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="horario" rotulo="Horário (opcional)" type="time" />
      </Grid>
      {values.frequencia === 'SEMANAL' ? (
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="diaSemana"
            rotulo="Toda semana, no dia"
            opcoes={NOMES_DIAS.map((dia, i) => ({ valor: i, rotulo: dia }))}
          />
        </Grid>
      ) : null}
      {values.frequencia === 'MENSAL' ? (
        <Grid item xs={12} sm={6}>
          <CampoFormik name="diaMes" rotulo="Todo mês, no dia" type="number" inputProps={{ min: 1, max: 31 }} />
        </Grid>
      ) : null}
    </>
  );
};

interface Props {
  aberto: boolean;
  tarefa: Tarefa | null;
  tituloInicial?: string;
  sugestoes: SugestoesTarefa;
  aoFechar: () => void;
  aoSalvar: (t: Tarefa, nova: boolean) => void;
}

/** Formulário completo ("Mais opções" / "Editar"). */
const FormularioTarefa = ({ aberto, tarefa, tituloInicial, sugestoes, aoFechar, aoSalvar }: Props) => {
  const hoje = new Date();
  const valoresIniciais: RequisicaoTarefa = {
    titulo: tarefa?.titulo ?? tituloInicial ?? '',
    prioridade: tarefa?.prioridade ?? 'MEDIA',
    prazo: tarefa?.prazo ?? tarefa?.proxima ?? hojeIso(),
    horario: tarefa?.horario?.slice(0, 5) ?? '',
    frequencia: tarefa?.frequencia ?? '',
    diaSemana: tarefa?.diaSemana ?? 1,
    diaMes: tarefa?.diaMes ?? hoje.getDate(),
    responsavel: tarefa?.responsavel ?? '',
    categoria: tarefa?.categoria ?? '',
    descricao: tarefa?.descricao ?? '',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      rotuloSalvar={tarefa ? 'Salvar alterações' : 'Criar tarefa'}
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        const salva = tarefa ? await servicoTarefas.atualizar(tarefa.id, valores) : await servicoTarefas.criar(valores);
        aoSalvar(salva, !tarefa);
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="titulo" rotulo="O que precisa ser feito?" obrigatorio limite={LIMITES.TAREFA_TITULO} autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="frequencia" rotulo="Repete?" opcoes={OPCOES_REPETE} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="prioridade" rotulo="Prioridade" opcoes={OPCOES_PRIORIDADE} />
        </Grid>
        <CamposRepeticao />
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="responsavel"
            rotulo="Responsável"
            limite={LIMITES.RESPONSAVEL}
            placeholder="Ex.: Secretaria"
            inputProps={{ list: 'sugestoes-responsavel' }}
          />
          <datalist id="sugestoes-responsavel">
            {sugestoes.responsaveis.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="categoria"
            rotulo="Categoria"
            limite={LIMITES.TAREFA_CATEGORIA}
            placeholder="Ex.: administrativo"
            inputProps={{ list: 'sugestoes-categoria' }}
          />
          <datalist id="sugestoes-categoria">
            {sugestoes.categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="descricao" rotulo="Detalhes" multiline minRows={3} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioTarefa;

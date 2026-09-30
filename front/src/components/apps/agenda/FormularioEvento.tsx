import { useEffect, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoAgenda } from 'src/servicos/agenda';
import { servicoTarefas } from 'src/servicos/tarefas';
import { Prioridade, ROTULO_PRIORIDADE } from 'src/types/comum';
import { EventoDetalhe, RequisicaoEvento, ROTULO_TIPO_EVENTO, TipoEvento } from 'src/types/agenda';
import { fimPadraoRepeticao, hora } from 'src/utils/agenda';
import { formatarData } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  titulo: regras.obrigatorio(LIMITES.EVENTO_TITULO),
  data: Yup.string().required('Informe a data'),
  horarioFim: Yup.string().test('depois-do-inicio', 'O término não pode ser antes do início', function (fim) {
    const { horarioInicio } = this.parent as RequisicaoEvento;
    return !fim || !horarioInicio || fim >= horarioInicio;
  }),
  repetirAte: Yup.string().test('depois-da-data', 'Precisa ser depois da data do evento', function (ate) {
    const { frequencia, data } = this.parent as RequisicaoEvento;
    return !frequencia || !ate || !data || ate >= data;
  }),
  local: regras.texto(LIMITES.EVENTO_LOCAL),
  responsavel: regras.texto(LIMITES.RESPONSAVEL),
  participantes: regras.texto(LIMITES.EVENTO_PARTICIPANTES),
  descricao: regras.texto(LIMITES.TEXTO_LONGO),
});

const OPCOES_TIPO = (Object.keys(ROTULO_TIPO_EVENTO) as TipoEvento[]).map((t) => ({ valor: t, rotulo: ROTULO_TIPO_EVENTO[t] }));
const OPCOES_PRIORIDADE = (Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => ({ valor: p, rotulo: ROTULO_PRIORIDADE[p] }));
const OPCOES_REPETE = [
  { valor: '', rotulo: 'Não repete' },
  { valor: 'DIARIA', rotulo: 'Todo dia' },
  { valor: 'SEMANAL', rotulo: 'Toda semana' },
  { valor: 'MENSAL', rotulo: 'Todo mês' },
  { valor: 'ANUAL', rotulo: 'Todo ano' },
];

/** "Repete?" + "Repetir até" (fora de série) ou "Aplicar as alterações a" (em série). */
const CamposRepeticao = ({ evento }: { evento: EventoDetalhe | null }) => {
  const { values } = useFormikContext<RequisicaoEvento>();
  if (evento && evento.total > 1) {
    return (
      <Grid item xs={12} sm={6}>
        <CampoFormik
          name="escopo"
          rotulo="Aplicar as alterações a"
          opcoes={[
            { valor: 'SO_ESTA', rotulo: `Só a data de ${formatarData(evento.data)}` },
            { valor: 'ESTA_E_PROXIMAS', rotulo: `Esta e as próximas (${evento.restantes})` },
          ]}
        />
      </Grid>
    );
  }
  return (
    <>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="frequencia" rotulo="Repete?" opcoes={OPCOES_REPETE} />
      </Grid>
      {values.frequencia ? (
        <Grid item xs={12} sm={6}>
          <CampoFormik name="repetirAte" rotulo="Repetir até" type="date" />
        </Grid>
      ) : null}
    </>
  );
};

interface Props {
  aberto: boolean;
  evento: EventoDetalhe | null;
  dataInicial: string;
  /** O usuário vê tarefas (TAREFA_LER): mostra "Ligar a uma tarefa". */
  verTarefas: boolean;
  aoFechar: () => void;
  aoSalvar: (e: EventoDetalhe, novo: boolean) => void;
}

/** Novo evento / editar evento (campos na ordem do formulário antigo). */
const FormularioEvento = ({ aberto, evento, dataInicial, verTarefas, aoFechar, aoSalvar }: Props) => {
  const [tarefas, setTarefas] = useState<{ valor: number | ''; rotulo: string }[]>([]);

  useEffect(() => {
    if (!aberto || !verTarefas) return;
    let ativo = true;
    servicoTarefas
      .ativas()
      .then((lista) => {
        if (!ativo) return;
        const abertas = lista
          .filter((t) => t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA')
          .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
          .map((t) => ({ valor: t.id as number | '', rotulo: t.titulo }));
        // A tarefa já ligada continua na lista mesmo se foi concluída depois.
        if (evento?.tarefaId && !abertas.some((t) => t.valor === evento.tarefaId)) {
          abertas.unshift({ valor: evento.tarefaId, rotulo: evento.tarefaTitulo ?? `Tarefa ${evento.tarefaId}` });
        }
        setTarefas([{ valor: '', rotulo: 'Nenhuma' }, ...abertas]);
      })
      .catch(() => ativo && setTarefas([]));
    return () => {
      ativo = false;
    };
  }, [aberto, verTarefas, evento]);

  const data = evento?.data ?? dataInicial;
  const valoresIniciais: RequisicaoEvento = {
    titulo: evento?.titulo ?? '',
    data,
    tipo: evento?.tipo ?? 'COMPROMISSO',
    prioridade: evento?.prioridade ?? 'MEDIA',
    horarioInicio: hora(evento?.horarioInicio ?? null),
    horarioFim: hora(evento?.horarioFim ?? null),
    local: evento?.local ?? '',
    responsavel: evento?.responsavel ?? '',
    participantes: evento?.participantes ?? '',
    descricao: evento?.descricao ?? '',
    tarefaId: evento?.tarefaId ?? '',
    frequencia: '',
    repetirAte: fimPadraoRepeticao(data),
    escopo: 'SO_ESTA',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={evento ? 'Editar evento' : 'Novo evento'}
      valoresIniciais={valoresIniciais}
      esquema={esquema}
      largura="md"
      rotuloSalvar={evento ? 'Salvar alterações' : 'Criar evento'}
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        const salvo = evento ? await servicoAgenda.atualizar(evento.id, valores) : await servicoAgenda.criar(valores);
        aoSalvar(salvo, !evento);
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="titulo" rotulo="O que vai acontecer?" obrigatorio limite={LIMITES.EVENTO_TITULO} autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="data" rotulo="Data" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="tipo" rotulo="Tipo" opcoes={OPCOES_TIPO} />
        </Grid>
        <Grid item xs={6}>
          <CampoFormik name="horarioInicio" rotulo="Começa às" type="time" />
        </Grid>
        <Grid item xs={6}>
          <CampoFormik name="horarioFim" rotulo="Termina às" type="time" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="local" rotulo="Local" limite={LIMITES.EVENTO_LOCAL} placeholder="Ex.: sala de reuniões" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="responsavel" rotulo="Responsável" limite={LIMITES.RESPONSAVEL} />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" color="textSecondary" mt={3}>
            Mais detalhes
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="participantes" rotulo="Participantes" limite={LIMITES.EVENTO_PARTICIPANTES} placeholder="Separe por vírgulas" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="prioridade" rotulo="Prioridade" opcoes={OPCOES_PRIORIDADE} />
        </Grid>
        <CamposRepeticao evento={evento} />
        {verTarefas ? (
          <Grid item xs={12}>
            <CampoFormik name="tarefaId" rotulo="Ligar a uma tarefa da Secretaria (opcional)" opcoes={tarefas.length ? tarefas : [{ valor: '', rotulo: 'Nenhuma' }]} />
          </Grid>
        ) : null}
        <Grid item xs={12}>
          <CampoFormik name="descricao" rotulo="Observações" multiline minRows={3} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioEvento;

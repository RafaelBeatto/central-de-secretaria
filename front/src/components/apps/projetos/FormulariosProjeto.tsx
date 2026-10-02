import { Alert, Grid } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoProjetos } from 'src/servicos/projetos';
import {
  ExecucaoDetalhe,
  RecursoDetalhe,
  RequisicaoExecucao,
  RequisicaoRecurso,
  ROTULO_STATUS_EXECUCAO,
  ROTULO_STATUS_RECURSO,
  StatusExecucao,
  StatusRecurso,
} from 'src/types/projetos';
import { hojeIso } from 'src/utils/datas';
import { formatarMoeda, PROPS_VALOR } from 'src/utils/projetos';
import { regras, Yup } from 'src/utils/validacao';

const periodo = {
  dataInicio: Yup.string().required('Informe a data de início'),
  dataFim: Yup.string()
    .required('Informe a data de término')
    .test('depois', 'A data de término não pode ser anterior à de início.', (v, ctx) => !v || !ctx.parent.dataInicio || v >= ctx.parent.dataInicio),
};

const esquemaRecurso = Yup.object({
  nome: regras.obrigatorio(LIMITES.PROJETO_NOME),
  fonteRecurso: regras.obrigatorio(LIMITES.PROJETO_FONTE),
  orgaoRepassador: regras.texto(LIMITES.PROJETO_ORGAO),
  convenio: regras.texto(LIMITES.PROJETO_CONVENIO),
  ...periodo,
  valorRecebido: regras.valor(),
  contaBancaria: regras.texto(LIMITES.PROJETO_CONTA),
  responsavel: regras.texto(LIMITES.RESPONSAVEL),
  finalidade: regras.texto(LIMITES.TEXTO_LONGO),
  observacoes: regras.texto(LIMITES.TEXTO_LONGO),
});

const esquemaExecucao = Yup.object({
  nome: regras.obrigatorio(LIMITES.PROJETO_NOME),
  fonteRecurso: regras.obrigatorio(LIMITES.PROJETO_FONTE),
  convenio: regras.texto(LIMITES.PROJETO_CONVENIO),
  ...periodo,
  valorPlanejado: regras.valor(),
  responsavel: regras.texto(LIMITES.RESPONSAVEL),
  objetivo: regras.texto(LIMITES.TEXTO_LONGO),
  observacoes: regras.texto(LIMITES.TEXTO_LONGO),
});

const opcoes = <T extends string>(rotulos: Record<T, string>) => (Object.keys(rotulos) as T[]).map((v) => ({ valor: v, rotulo: rotulos[v] }));

/** Recurso: o dinheiro que entrou (old: openFormProjeto com tipo recurso). */
export const FormularioRecurso = ({ aberto, recurso: r, aoFechar, aoSalvar }: { aberto: boolean; recurso: RecursoDetalhe | null; aoFechar: () => void; aoSalvar: (r: RecursoDetalhe) => void }) => {
  const valores: RequisicaoRecurso = {
    nome: r?.nome ?? '',
    fonteRecurso: r?.fonteRecurso ?? '',
    orgaoRepassador: r?.orgaoRepassador ?? '',
    convenio: r?.convenio ?? '',
    dataRecebimento: r ? r.dataRecebimento ?? '' : hojeIso(),
    dataInicio: r?.dataInicio ?? hojeIso(),
    dataFim: r?.dataFim ?? '',
    valorRecebido: r?.valorRecebido ?? '',
    contaBancaria: r?.contaBancaria ?? '',
    responsavel: r?.responsavel ?? '',
    status: r?.status ?? 'AGUARDANDO_EXECUCAO',
    finalidade: r?.finalidade ?? '',
    observacoes: r?.observacoes ?? '',
  };
  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={r ? 'Editar recurso' : 'Novo recurso'}
      valoresIniciais={valores}
      esquema={esquemaRecurso}
      largura="md"
      rotuloSalvar={r ? 'Salvar alterações' : 'Cadastrar recurso'}
      aoFechar={aoFechar}
      aoEnviar={async (v) => aoSalvar(r ? await servicoProjetos.atualizarRecurso(r.id, v) : await servicoProjetos.criarRecurso(v))}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="nome" rotulo="Nome do recurso" obrigatorio limite={LIMITES.PROJETO_NOME} placeholder="Ex.: Sicredi 2026" autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="fonteRecurso" rotulo="Tipo/origem do recurso" obrigatorio limite={LIMITES.PROJETO_FONTE} placeholder="Ex.: Convênio, emenda, recurso próprio" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="orgaoRepassador" rotulo="Órgão/empresa/entidade que repassou" limite={LIMITES.PROJETO_ORGAO} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="convenio" rotulo="Convênio / termo / processo" limite={LIMITES.PROJETO_CONVENIO} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataRecebimento" rotulo="Data do recebimento" type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataInicio" rotulo="Data de início" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataFim" rotulo="Data de término" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="valorRecebido" rotulo="Valor recebido (R$)" obrigatorio {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="contaBancaria" rotulo="Conta bancária vinculada" limite={LIMITES.PROJETO_CONTA} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="responsavel" rotulo="Responsável" limite={LIMITES.RESPONSAVEL} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="status" rotulo="Status" opcoes={opcoes<StatusRecurso>(ROTULO_STATUS_RECURSO)} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="finalidade" rotulo="Finalidade" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="observacoes" rotulo="Observações" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

interface PropsExecucao {
  aberto: boolean;
  /** Ao criar: o recurso pai (nome, fonte e responsável sugeridos, valor livre). */
  recurso?: { id: number; nome: string; fonteRecurso: string; responsavel: string | null; livre: number } | null;
  execucao: ExecucaoDetalhe | null;
  aoFechar: () => void;
  aoSalvar: (e: ExecucaoDetalhe) => void;
}

/** Execução: uma aplicação do recurso; nunca passa do saldo não distribuído (o back confere). */
export const FormularioExecucao = ({ aberto, recurso, execucao: e, aoFechar, aoSalvar }: PropsExecucao) => {
  const valores: RequisicaoExecucao = {
    nome: e?.nome ?? '',
    fonteRecurso: e?.fonteRecurso ?? recurso?.fonteRecurso ?? '',
    convenio: e?.convenio ?? '',
    dataInicio: e?.dataInicio ?? hojeIso(),
    dataFim: e?.dataFim ?? '',
    valorPlanejado: e?.valorPlanejado ?? '',
    responsavel: e?.responsavel ?? recurso?.responsavel ?? '',
    status: e?.status ?? 'PLANEJAMENTO',
    objetivo: e?.objetivo ?? '',
    observacoes: e?.observacoes ?? '',
  };
  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={e ? 'Editar execução' : 'Nova execução'}
      valoresIniciais={valores}
      esquema={esquemaExecucao}
      largura="md"
      rotuloSalvar={e ? 'Salvar alterações' : 'Cadastrar execução'}
      aoFechar={aoFechar}
      aoEnviar={async (v) => {
        if (e) aoSalvar(await servicoProjetos.atualizarExecucao(e.id, v));
        else if (recurso) aoSalvar(await servicoProjetos.criarExecucao(recurso.id, v));
      }}
    >
      {recurso ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          Execução do recurso <strong>{recurso.nome}</strong> · livre para distribuir: <strong>{formatarMoeda(recurso.livre)}</strong>
        </Alert>
      ) : null}
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="nome" rotulo="Nome da execução" obrigatorio limite={LIMITES.PROJETO_NOME} placeholder="Ex.: Reforma da sala de fisioterapia" autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="fonteRecurso" rotulo="Fonte do recurso" obrigatorio limite={LIMITES.PROJETO_FONTE} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="convenio" rotulo="Convênio / termo / processo" limite={LIMITES.PROJETO_CONVENIO} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataInicio" rotulo="Data de início" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="dataFim" rotulo="Data de término" obrigatorio type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="valorPlanejado" rotulo="Valor planejado (R$)" obrigatorio {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="responsavel" rotulo="Responsável" limite={LIMITES.RESPONSAVEL} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="status" rotulo="Status" opcoes={opcoes<StatusExecucao>(ROTULO_STATUS_EXECUCAO)} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="objetivo" rotulo="Objetivo" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik name="observacoes" rotulo="Observações" multiline minRows={2} limite={LIMITES.TEXTO_LONGO} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

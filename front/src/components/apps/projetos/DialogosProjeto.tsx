import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { FieldArray, useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CampoArquivoFormik from 'src/components/formularios/CampoArquivoFormik';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { LIMITES } from 'src/constantes/limites';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoProjetos } from 'src/servicos/projetos';
import { Prioridade, ROTULO_PRIORIDADE } from 'src/types/comum';
import type { Empresa } from 'src/types/empresas';
import {
  CategoriaDocumentoExecucao,
  ExecucaoDetalhe,
  ExecucaoResumo,
  RecursoDetalhe,
  ROTULO_CATEGORIA_DOC_EXECUCAO,
  ROTULO_STATUS_ORDEM,
  StatusOrdemCompra,
} from 'src/types/projetos';
import { hojeIso } from 'src/utils/datas';
import { ErroApi, mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, normalizar } from 'src/utils/formatacao';
import { avisoDocumentosEmpresa, formatarMoeda, PROPS_VALOR } from 'src/utils/projetos';
import { regras, Yup } from 'src/utils/validacao';

const opcoes = <T extends string>(rotulos: Record<T, string>) => (Object.keys(rotulos) as T[]).map((v) => ({ valor: v, rotulo: rotulos[v] }));
const arquivoObrigatorio = (mensagem: string) => Yup.number().nullable().required(mensagem);
/** Recusar o aviso deixa o formulário aberto, com a explicação no topo. */
const naoConfirmado = (mensagem: string) => new ErroApi(0, mensagem);

const DOCUMENTOS_RECURSO = ['Termo', 'Convênio', 'Plano geral', 'Comprovante de recebimento', 'Documentação do recurso', 'Outros documentos'];

// ----- recurso -----

export const DialogoDocumentoRecurso = ({ recurso, aoFechar, aoSalvar }: { recurso: RecursoDetalhe | null; aoFechar: () => void; aoSalvar: (r: RecursoDetalhe) => void }) => (
  <DialogoFormulario
    aberto={!!recurso}
    titulo="Adicionar documento do recurso"
    valoresIniciais={{ nome: DOCUMENTOS_RECURSO[0], observacao: '', arquivoId: null as number | null }}
    esquema={Yup.object({ nome: regras.obrigatorio(LIMITES.RECURSO_DOCUMENTO_NOME), observacao: regras.texto(LIMITES.PROJETO_OBSERVACAO), arquivoId: arquivoObrigatorio('Anexe o arquivo') })}
    rotuloSalvar="Salvar documento"
    aoFechar={aoFechar}
    aoEnviar={async (v) => recurso && aoSalvar(await servicoProjetos.adicionarDocumentoRecurso(recurso.id, v))}
  >
    <CampoFormik name="nome" rotulo="Documento" obrigatorio opcoes={DOCUMENTOS_RECURSO.map((d) => ({ valor: d, rotulo: d }))} />
    <CampoArquivoFormik name="arquivoId" rotulo="Arquivo" obrigatorio categoria="DOCUMENTO_RECURSO" />
    <CampoFormik name="observacao" rotulo="Observação" multiline minRows={2} limite={LIMITES.PROJETO_OBSERVACAO} />
  </DialogoFormulario>
);

/** Move saldo entre execuções do mesmo recurso; nunca altera valores sem registrar a movimentação. */
export const DialogoTransferencia = ({ recurso, aoFechar, aoSalvar }: { recurso: RecursoDetalhe | null; aoFechar: () => void; aoSalvar: (r: RecursoDetalhe) => void }) => {
  const ativas = (recurso?.execucoes ?? []).filter((e) => e.status !== 'CANCELADO');
  return (
    <DialogoFormulario
      aberto={!!recurso}
      titulo="Transferir saldo entre execuções"
      valoresIniciais={{ origemId: (ativas[0]?.id ?? '') as number | '', destinoId: (ativas[1]?.id ?? '') as number | '', valor: '' as number | '', motivo: '' }}
      esquema={Yup.object({
        origemId: Yup.number().required('Escolha a origem'),
        destinoId: Yup.number().required('Escolha o destino').notOneOf([Yup.ref('origemId')], 'Escolha execuções diferentes'),
        valor: regras.valor(0.01),
        motivo: regras.obrigatorio(LIMITES.PROJETO_OBSERVACAO),
      })}
      rotuloSalvar="Transferir"
      aoFechar={aoFechar}
      aoEnviar={async (v) => recurso && aoSalvar(await servicoProjetos.transferir(recurso.id, v))}
    >
      <CampoFormik name="origemId" rotulo="Execução de origem" obrigatorio opcoes={ativas.map((e) => ({ valor: e.id, rotulo: `${e.nome} (saldo: ${formatarMoeda(e.situacao.saldo)})` }))} />
      <CampoFormik name="destinoId" rotulo="Execução de destino" obrigatorio opcoes={ativas.map((e) => ({ valor: e.id, rotulo: e.nome }))} />
      <CampoFormik name="valor" rotulo="Valor a transferir (R$)" obrigatorio {...PROPS_VALOR} />
      <CampoFormik name="motivo" rotulo="Motivo" obrigatorio limite={LIMITES.PROJETO_OBSERVACAO} placeholder="Ex.: Economia na aquisição dos materiais" />
    </DialogoFormulario>
  );
};

// ----- execução -----

type PropsExecucao = { execucao: ExecucaoDetalhe | null; aoFechar: () => void; aoSalvar: (e: ExecucaoDetalhe) => void };

export const DialogoPlano = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => (
  <DialogoFormulario
    aberto={!!e}
    titulo="Plano de aplicação"
    valoresIniciais={{ descricao: e?.planoDescricao ?? '', arquivoId: e?.planoArquivoId ?? null }}
    esquema={Yup.object({ descricao: regras.obrigatorio(LIMITES.PLANO_DESCRICAO) })}
    rotuloSalvar="Salvar plano"
    aoFechar={aoFechar}
    aoEnviar={async (v) => e && aoSalvar(await servicoProjetos.salvarPlano(e.id, v))}
  >
    <CampoFormik name="descricao" rotulo="Como o recurso será utilizado?" obrigatorio multiline minRows={4} limite={LIMITES.PLANO_DESCRICAO} autoFocus />
    <CampoArquivoFormik name="arquivoId" rotulo="Plano aprovado / documento" categoria="PLANO_APLICACAO" />
  </DialogoFormulario>
);

/** Escolhe uma empresa já cadastrada (o cadastro é único; uma nova é criada em Empresas). */
export const DialogoVincularEmpresa = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => {
  const { notificar } = useInteracao();
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [busca, setBusca] = useState('');
  useEffect(() => {
    if (e) servicoEmpresas.listar().then(setEmpresas).catch((x) => notificar(mensagemDeErro(x), 'error'));
    else setEmpresas(null);
  }, [e, notificar]);
  const ja = new Set(e?.empresas.map((v) => v.empresa.id));
  const q = normalizar(busca);
  const disponiveis = (empresas ?? []).filter((x) => !ja.has(x.id) && (!q || normalizar(`${x.razaoSocial} ${x.cnpj ?? ''}`).includes(q)));
  const vincular = async (empresaId: number) => {
    if (!e) return;
    try {
      aoSalvar(await servicoProjetos.vincularEmpresa(e.id, empresaId));
      aoFechar();
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };
  return (
    <Dialog open={!!e} onClose={aoFechar} fullWidth maxWidth="sm">
      <DialogTitle>Ligar empresa à execução</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" mb={1}>
          Os dados da empresa continuam únicos e valem para todos os projetos. Empresa nova? Cadastre em Empresas.
        </Typography>
        <TextField type="search" size="small" fullWidth placeholder="Buscar por nome ou CNPJ…" value={busca} onChange={(x) => setBusca(x.target.value)} inputProps={{ 'aria-label': 'Buscar empresa' }} />
        {empresas && !disponiveis.length ? (
          <Typography color="textSecondary" mt={2}>
            Nenhuma empresa disponível.
          </Typography>
        ) : null}
        <List dense sx={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {disponiveis.map((x) => (
            <ListItemButton key={x.id} onClick={() => vincular(x.id)}>
              <ListItemText primary={x.razaoSocial} secondary={[x.cnpj, x.telefone].filter(Boolean).join(' · ') || 'Sem dados adicionais'} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={aoFechar}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface ValoresCotacao {
  empresaId: number | '';
  data: string;
  itens: { descricao: string; quantidade: number | ''; valorUnitario: number | '' }[];
  valorTotal: number | '';
  totalManual: boolean;
  observacao: string;
  arquivoId: number | null;
}

/** Valor total = soma dos itens, enquanto a pessoa não digitar outro valor (old: openFormCotacao). */
const ItensCotacao = () => {
  const { values, setFieldValue } = useFormikContext<ValoresCotacao>();
  const soma = useMemo(() => values.itens.reduce((t, i) => t + (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0), 0), [values.itens]);
  useEffect(() => {
    if (!values.totalManual) setFieldValue('valorTotal', soma ? Number(soma.toFixed(2)) : '');
  }, [soma, values.totalManual, setFieldValue]);
  return (
    <FieldArray name="itens">
      {({ push, remove }) => (
        <Box>
          <Typography variant="subtitle2" mt={2}>
            Itens cotados *
          </Typography>
          {values.itens.map((_, i) => (
            <Grid container columnSpacing={1} key={i} alignItems="flex-end">
              <Grid item xs={12} sm={6}>
                <CampoFormik name={`itens.${i}.descricao`} rotulo="Descrição do item" limite={LIMITES.COTACAO_ITEM_DESCRICAO} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <CampoFormik name={`itens.${i}.quantidade`} rotulo="Qtd." type="number" inputProps={{ min: 1, step: 1 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <CampoFormik name={`itens.${i}.valorUnitario`} rotulo="Valor (R$)" {...PROPS_VALOR} />
              </Grid>
              <Grid item xs={2} sm={1} pb={0.5}>
                <IconButton aria-label="Remover item" disabled={values.itens.length === 1} onClick={() => remove(i)}>
                  <IconTrash size={18} />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button size="small" startIcon={<IconPlus size={16} />} onClick={() => push({ descricao: '', quantidade: 1, valorUnitario: '' })} sx={{ mt: 1 }}>
            Adicionar item
          </Button>
        </Box>
      )}
    </FieldArray>
  );
};

const CampoTotalCotacao = () => {
  const { setFieldValue } = useFormikContext<ValoresCotacao>();
  return <CampoFormik name="valorTotal" rotulo="Valor total da proposta (R$)" obrigatorio {...PROPS_VALOR} onInput={() => setFieldValue('totalManual', true)} />;
};

export const DialogoCotacao = ({ execucao: e, empresaId, aoFechar, aoSalvar }: PropsExecucao & { empresaId: number | null }) => {
  const valores: ValoresCotacao = { empresaId: empresaId ?? '', data: hojeIso(), itens: [{ descricao: '', quantidade: 1, valorUnitario: '' }], valorTotal: '', totalManual: false, observacao: '', arquivoId: null };
  return (
    <DialogoFormulario
      aberto={!!e}
      titulo="Nova cotação"
      valoresIniciais={valores}
      esquema={Yup.object({
        empresaId: Yup.number().required('Escolha a empresa'),
        itens: Yup.array()
          .of(Yup.object({ descricao: regras.obrigatorio(LIMITES.COTACAO_ITEM_DESCRICAO), quantidade: Yup.number().typeError('Qtd.').required('Qtd.').integer().min(1), valorUnitario: regras.valor() }))
          .min(1),
        valorTotal: regras.valor(),
        observacao: regras.texto(LIMITES.PROJETO_OBSERVACAO),
        arquivoId: arquivoObrigatorio('Anexe a proposta / orçamento'),
      })}
      largura="md"
      rotuloSalvar="Salvar cotação"
      aoFechar={aoFechar}
      aoEnviar={async (v) => {
        if (!e) return;
        const itens = v.itens.map((i) => ({ descricao: i.descricao, quantidade: Number(i.quantidade), valorUnitario: Number(i.valorUnitario) }));
        aoSalvar(await servicoProjetos.adicionarCotacao(e.id, { empresaId: v.empresaId, data: v.data, itens, valorTotal: v.valorTotal, observacao: v.observacao, arquivoId: v.arquivoId }));
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12} sm={8}>
          <CampoFormik name="empresaId" rotulo="Empresa" obrigatorio opcoes={(e?.empresas ?? []).map((v) => ({ valor: v.empresa.id, rotulo: v.empresa.razaoSocial }))} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="data" rotulo="Data" type="date" />
        </Grid>
      </Grid>
      <ItensCotacao />
      <Grid container columnSpacing={3}>
        <Grid item xs={12} sm={6}>
          <CampoTotalCotacao />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="observacao" rotulo="Observação" limite={LIMITES.PROJETO_OBSERVACAO} />
        </Grid>
        <Grid item xs={12}>
          <CampoArquivoFormik name="arquivoId" rotulo="Proposta / orçamento" obrigatorio categoria="COTACAO" />
        </Grid>
      </Grid>
      <Alert severity="info" sx={{ mt: 2 }}>
        A cotação deve representar a proposta completa daquele fornecedor. Cadastre os itens dentro da própria cotação.
      </Alert>
    </DialogoFormulario>
  );
};

/** Aviso ao vivo dos documentos da empresa vencidos na data escolhida. */
const AvisoDocumentos = ({ empresa }: { empresa: Empresa | undefined }) => {
  const { values } = useFormikContext<{ data: string }>();
  const aviso = avisoDocumentosEmpresa(empresa, values.data);
  return aviso ? (
    <Alert severity="warning" sx={{ mt: 2 }}>
      {aviso}
    </Alert>
  ) : null;
};

export const DialogoOrdem = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => {
  const { confirmar } = useInteracao();
  const vencedora = e?.cotacoes.find((c) => c.vencedora);
  const empresa = e?.empresas.find((v) => v.empresa.id === vencedora?.empresaId)?.empresa;
  return (
    <DialogoFormulario
      aberto={!!e}
      titulo="Nova ordem de compra"
      valoresIniciais={{ numero: '', data: hojeIso(), valor: (vencedora?.valorTotal ?? '') as number | '', status: 'RASCUNHO' as StatusOrdemCompra, arquivoId: null as number | null }}
      esquema={Yup.object({ numero: regras.obrigatorio(LIMITES.ORDEM_NUMERO), valor: regras.valor(), arquivoId: arquivoObrigatorio('Anexe a ordem de compra') })}
      rotuloSalvar="Salvar ordem"
      aoFechar={aoFechar}
      aoEnviar={async (v) => {
        if (!e) return;
        const aviso = avisoDocumentosEmpresa(empresa, v.data);
        if (aviso && !(await confirmar(`${aviso} Emitir a ordem de compra mesmo assim?`, { rotuloConfirmar: 'Emitir mesmo assim' }))) {
          throw naoConfirmado('Ordem não salva. Confira a documentação da empresa.');
        }
        aoSalvar(await servicoProjetos.adicionarOrdem(e.id, v));
      }}
    >
      <Alert severity="info" sx={{ mb: 1 }}>
        Fornecedor: <strong>{empresa?.razaoSocial ?? '—'}</strong>
        {vencedora?.itens.length ? (
          <Box component="ul" m={0} pl={2.5}>
            {vencedora.itens.map((i, n) => (
              <li key={n}>
                {i.descricao} — {i.quantidade} × {formatarMoeda(i.valorUnitario)}
              </li>
            ))}
          </Box>
        ) : null}
      </Alert>
      <Grid container columnSpacing={3}>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="numero" rotulo="Número da ordem" obrigatorio limite={LIMITES.ORDEM_NUMERO} autoFocus />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="data" rotulo="Data" type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="valor" rotulo="Valor total (R$)" obrigatorio {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="status" rotulo="Status" opcoes={opcoes<StatusOrdemCompra>(ROTULO_STATUS_ORDEM)} />
        </Grid>
        <Grid item xs={12}>
          <CampoArquivoFormik name="arquivoId" rotulo="Ordem de compra" obrigatorio categoria="ORDEM_COMPRA" />
        </Grid>
      </Grid>
      <AvisoDocumentos empresa={empresa} />
      <Alert severity="info" sx={{ mt: 2 }}>
        Recomenda-se emitir a ordem somente após conferir as cotações e a documentação do fornecedor.
      </Alert>
    </DialogoFormulario>
  );
};

export const DialogoDocumentoExecucao = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => (
  <DialogoFormulario
    aberto={!!e}
    titulo="Anexar documento de execução"
    valoresIniciais={{ nome: '', categoria: 'NOTA_FISCAL' as CategoriaDocumentoExecucao, data: hojeIso(), arquivoId: null as number | null }}
    esquema={Yup.object({ nome: regras.obrigatorio(LIMITES.EXECUCAO_DOCUMENTO_NOME), arquivoId: arquivoObrigatorio('Anexe o arquivo') })}
    rotuloSalvar="Anexar"
    aoFechar={aoFechar}
    aoEnviar={async (v) => e && aoSalvar(await servicoProjetos.adicionarDocumento(e.id, v))}
  >
    <CampoFormik name="nome" rotulo="Nome do documento" obrigatorio limite={LIMITES.EXECUCAO_DOCUMENTO_NOME} autoFocus />
    <Grid container columnSpacing={3}>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="categoria" rotulo="Categoria" opcoes={opcoes<CategoriaDocumentoExecucao>(ROTULO_CATEGORIA_DOC_EXECUCAO)} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="data" rotulo="Data" type="date" />
      </Grid>
    </Grid>
    <CampoArquivoFormik name="arquivoId" rotulo="Arquivo" obrigatorio categoria="DOCUMENTO_EXECUCAO" />
  </DialogoFormulario>
);

const FORMAS_PAGAMENTO = ['Pix', 'Transferência', 'Boleto', 'Cheque', 'Dinheiro'];

/** Pagamento: avisa se passar do saldo da execução ou se a empresa tiver documento vencido na data. */
export const DialogoPagamento = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => {
  const { confirmar } = useInteracao();
  const vencedora = e?.cotacoes.find((c) => c.vencedora);
  const empresaDe = (id: number | '') => e?.empresas.find((v) => v.empresa.id === id)?.empresa;
  return (
    <DialogoFormulario
      aberto={!!e}
      titulo="Registrar pagamento"
      valoresIniciais={{ empresaId: (vencedora?.empresaId ?? '') as number | '', fornecedor: '', data: hojeIso(), valor: '' as number | '', forma: '', arquivoId: null as number | null }}
      esquema={Yup.object({ fornecedor: regras.texto(LIMITES.PAGAMENTO_FORNECEDOR), valor: regras.valor(0.01), forma: regras.texto(LIMITES.PAGAMENTO_FORMA), arquivoId: arquivoObrigatorio('Anexe o comprovante') })}
      rotuloSalvar="Salvar pagamento"
      aoFechar={aoFechar}
      aoEnviar={async (v) => {
        if (!e) return;
        const avisos = [
          Number(v.valor) > e.situacao.saldo + 0.005 ? `Este pagamento (${formatarMoeda(Number(v.valor))}) passa do saldo da execução (${formatarMoeda(e.situacao.saldo)}).` : '',
          avisoDocumentosEmpresa(empresaDe(v.empresaId), v.data),
        ].filter(Boolean);
        if (avisos.length && !(await confirmar(`${avisos.join(' ')} Registrar mesmo assim?`, { rotuloConfirmar: 'Registrar mesmo assim' }))) {
          throw naoConfirmado('Pagamento não registrado.');
        }
        aoSalvar(await servicoProjetos.adicionarPagamento(e.id, v));
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="empresaId"
            rotulo="Empresa"
            opcoes={[{ valor: '', rotulo: 'Outro fornecedor' }, ...(e?.empresas ?? []).map((v) => ({ valor: v.empresa.id, rotulo: v.empresa.razaoSocial }))]}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="fornecedor" rotulo="Fornecedor (se não for uma das empresas)" limite={LIMITES.PAGAMENTO_FORNECEDOR} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="data" rotulo="Data" type="date" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="valor" rotulo="Valor pago (R$)" obrigatorio {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="forma" rotulo="Forma de pagamento" limite={LIMITES.PAGAMENTO_FORMA} placeholder="Pix, boleto…" inputProps={{ list: 'formas-pagamento' }} />
          <datalist id="formas-pagamento">
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Grid>
        <Grid item xs={12}>
          <CampoArquivoFormik name="arquivoId" rotulo="Comprovante" obrigatorio categoria="COMPROVANTE_PAGAMENTO" />
        </Grid>
      </Grid>
      {e ? (
        <Typography variant="body2" color="textSecondary" mt={2}>
          Planejado {formatarMoeda(e.situacao.planejado)} · já pago {formatarMoeda(e.situacao.pago)} · saldo {formatarMoeda(e.situacao.saldo)}
        </Typography>
      ) : null}
      <AvisoPagamento empresaDe={empresaDe} />
    </DialogoFormulario>
  );
};

const AvisoPagamento = ({ empresaDe }: { empresaDe: (id: number | '') => Empresa | undefined }) => {
  const { values } = useFormikContext<{ empresaId: number | ''; data: string }>();
  const aviso = avisoDocumentosEmpresa(empresaDe(values.empresaId), values.data);
  return aviso ? (
    <Alert severity="warning" sx={{ mt: 2 }}>
      {aviso}
    </Alert>
  ) : null;
};

export const DialogoPendencia = ({ execucao: e, aoFechar, aoSalvar }: PropsExecucao) => (
  <DialogoFormulario
    aberto={!!e}
    titulo="Nova pendência"
    valoresIniciais={{ titulo: '', prioridade: 'MEDIA' as Prioridade, descricao: '' }}
    esquema={Yup.object({ titulo: regras.obrigatorio(LIMITES.PENDENCIA_TITULO), descricao: regras.texto(LIMITES.PENDENCIA_DESCRICAO) })}
    rotuloSalvar="Salvar pendência"
    aoFechar={aoFechar}
    aoEnviar={async (v) => e && aoSalvar(await servicoProjetos.adicionarPendencia(e.id, v))}
  >
    <CampoFormik name="titulo" rotulo="O que precisa ser resolvido?" obrigatorio limite={LIMITES.PENDENCIA_TITULO} autoFocus />
    <CampoFormik name="prioridade" rotulo="Prioridade" opcoes={opcoes<Prioridade>(ROTULO_PRIORIDADE)} />
    <CampoFormik name="descricao" rotulo="Detalhes (opcional)" multiline minRows={2} limite={LIMITES.PENDENCIA_DESCRICAO} />
  </DialogoFormulario>
);

/** Ficha da empresa → "Ligar a um projeto": escolhe uma execução em andamento. */
export const DialogoEscolherExecucao = ({ aberto, empresa, aoFechar, aoLigar }: { aberto: boolean; empresa: Empresa | null; aoFechar: () => void; aoLigar: () => void }) => {
  const { notificar } = useInteracao();
  const [lista, setLista] = useState<ExecucaoResumo[] | null>(null);
  useEffect(() => {
    if (aberto) servicoProjetos.execucoesDoKanban().then((l) => setLista(l.filter((x) => x.status !== 'CONCLUIDO'))).catch((x) => notificar(mensagemDeErro(x), 'error'));
  }, [aberto, notificar]);
  const ligar = async (execucaoId: number) => {
    if (!empresa) return;
    try {
      await servicoProjetos.vincularEmpresa(execucaoId, empresa.id);
      notificar('Empresa ligada ao projeto.');
      aoLigar();
      aoFechar();
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };
  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="sm">
      <DialogTitle>Ligar “{empresa?.razaoSocial}” a qual execução?</DialogTitle>
      <DialogContent dividers>
        {lista && !lista.length ? <Typography color="textSecondary">Não há execução em andamento.</Typography> : null}
        <List dense>
          {(lista ?? []).map((x) => (
            <ListItemButton key={x.id} onClick={() => ligar(x.id)}>
              <ListItemText primary={x.nome} secondary={`${x.recursoNome} · até ${formatarData(x.dataFim)}`} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={aoFechar}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

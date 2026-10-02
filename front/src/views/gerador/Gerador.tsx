import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Grid, LinearProgress, Stack, Tab, Tabs, TextField, Theme, useMediaQuery } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import DetalheDocumentoGerado from 'src/components/apps/gerador/DetalheDocumentoGerado';
import DialogoEscolherModelo from 'src/components/apps/gerador/DialogoEscolherModelo';
import DialogoVisualizar from 'src/components/apps/gerador/DialogoVisualizar';
import FormularioGerador, { VinculoInicial } from 'src/components/apps/gerador/FormularioGerador';
import FormularioModelo from 'src/components/apps/gerador/FormularioModelo';
import ListaDocumentosGerados from 'src/components/apps/gerador/ListaDocumentosGerados';
import ListaModelos from 'src/components/apps/gerador/ListaModelos';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoGerador } from 'src/servicos/gerador';
import { useSelector } from 'src/store/Store';
import type { DocumentoGerado, ModeloDocumento, TipoVinculo, VersaoDocumentoGerado } from 'src/types/gerador';
import { ROTULO_VINCULO } from 'src/types/gerador';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { carregarInstituicao, fonteDoDocumento, InstituicaoCarregada, montarHtmlDocumento, nomeArquivoPdf, nomeDocumento, textoBusca } from 'src/utils/gerador';
import { ROTA_VINCULO } from 'src/utils/geradorVinculos';
import { imprimir, salvarPdf } from 'src/utils/impressaoPdf';

type Aba = 'documentos' | 'modelos';
const TIPOS = Object.keys(ROTULO_VINCULO) as TipoVinculo[];

/** Gerador de documentos (old/js/17-gerador-documentos.js e 17b-gerador-telas.js). Aceita ?documento=ID e ?vinculoTipo&vinculoId. */
const Gerador = () => {
  const { podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const navegar = useNavigate();
  const alterar = podeAlterar(PERMISSOES.GERADOR_ESCREVER);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const { dados: documentos, carregando, erro, recarregar: recarregarDocumentos } = useConsulta(servicoGerador.documentos);
  const { dados: modelos, recarregar: recarregarModelos } = useConsulta(servicoGerador.modelos);
  const [instituicao, setInstituicao] = useState<InstituicaoCarregada>();
  useEffect(() => {
    carregarInstituicao().then(setInstituicao).catch(() => setInstituicao(undefined));
  }, [unidadeVisualizadaId]);

  const [aba, setAba] = useState<Aba>('documentos');
  const [filtro, setFiltro] = useState({ busca: '', modeloId: null as number | null });
  const [selecionado, setSelecionado] = useState<DocumentoGerado | null>(null);
  const [escolhendo, setEscolhendo] = useState<{ aberto: boolean; vinculo: VinculoInicial | null; rotulo: string | null }>({ aberto: false, vinculo: null, rotulo: null });
  const [formulario, setFormulario] = useState<{ aberto: boolean; modelo: ModeloDocumento | null; documento: DocumentoGerado | null; vinculo: VinculoInicial | null }>({
    aberto: false,
    modelo: null,
    documento: null,
    vinculo: null,
  });
  const [editandoModelo, setEditandoModelo] = useState<{ aberto: boolean; modelo: ModeloDocumento | null }>({ aberto: false, modelo: null });
  const [visualizando, setVisualizando] = useState<{ html: string; titulo: string; versao: VersaoDocumentoGerado | null } | null>(null);

  useEffect(() => setSelecionado(null), [unidadeVisualizadaId]);

  const abrir = useCallback(
    async (id: number) => {
      try {
        setSelecionado(await servicoGerador.documento(id));
        setAba('documentos');
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
      }
    },
    [notificar],
  );

  // Vindo de outra tela: ?documento=ID abre o detalhe; ?vinculoTipo&vinculoId (ficha da empresa…) abre "Qual documento?".
  const [parametros, setParametros] = useSearchParams();
  const documentoPedido = Number(parametros.get('documento')) || null;
  const tipoPedido = parametros.get('vinculoTipo') as TipoVinculo | null;
  const idPedido = Number(parametros.get('vinculoId')) || null;
  useEffect(() => {
    if (documentoPedido) {
      abrir(documentoPedido);
      setParametros({}, { replace: true });
    } else if (tipoPedido && idPedido && TIPOS.includes(tipoPedido)) {
      if (alterar) setEscolhendo({ aberto: true, vinculo: { tipo: tipoPedido, id: idPedido }, rotulo: ROTULO_VINCULO[tipoPedido] });
      setParametros({}, { replace: true });
    }
  }, [documentoPedido, tipoPedido, idPedido, alterar, abrir, setParametros]);

  const todos = useMemo(() => documentos ?? [], [documentos]);
  const filtrados = useMemo(() => {
    const q = normalizar(filtro.busca);
    return todos.filter((d) => (filtro.modeloId === null || d.modeloId === filtro.modeloId) && (!q || normalizar(textoBusca(d)).includes(q)));
  }, [todos, filtro]);
  const porModelo = useMemo(() => {
    const mapa = new Map<number, { nome: string; n: number }>();
    todos.forEach((d) => d.modeloId && mapa.set(d.modeloId, { nome: d.modeloNome, n: (mapa.get(d.modeloId)?.n ?? 0) + 1 }));
    return [...mapa.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [todos]);

  const depoisDeSalvar = (d: DocumentoGerado, novo: boolean) => {
    setSelecionado(d);
    setAba('documentos');
    recarregarDocumentos();
    recarregarModelos();
    notificar(novo ? `${nomeDocumento(d)} gerado.` : `Versão ${d.versao} salva.`);
  };

  const htmlDe = (d: DocumentoGerado, versao?: VersaoDocumentoGerado) => montarHtmlDocumento(fonteDoDocumento(d, versao), instituicao);
  const rotuloDe = (d: DocumentoGerado, versao?: VersaoDocumentoGerado) => nomeDocumento(d) + (versao ? ` — versão ${versao.versao}` : '');

  const pdf = async (d: DocumentoGerado, versao?: VersaoDocumentoGerado) => {
    try {
      notificar('Gerando PDF…');
      await salvarPdf(htmlDe(d, versao), nomeArquivoPdf(d), { paginaXdeY: instituicao?.unidade.rodapeMostrarPagina });
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };
  const imprimirDoc = (d: DocumentoGerado, versao?: VersaoDocumentoGerado) => {
    try {
      imprimir(htmlDe(d, versao), rotuloDe(d, versao));
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const excluir = async (d: DocumentoGerado) => {
    const extras = [d.versoes.length && `${d.versoes.length} versão(ões) anterior(es)`, d.anexos.length && `${d.anexos.length} anexo(s)`].filter(Boolean).join(' e ');
    if (!(await confirmar(`Excluir "${nomeDocumento(d)}"${extras ? ` com ${extras}` : ''}?`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoGerador.excluir(d.id);
      setSelecionado(null);
      recarregarDocumentos();
      recarregarModelos();
      notificar('Documento excluído.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const duplicar = async (d: DocumentoGerado) => {
    try {
      const copia = await servicoGerador.duplicar(d.id);
      setSelecionado(copia);
      recarregarDocumentos();
      recarregarModelos();
      notificar(copia.numero ? `Cópia criada: ${nomeDocumento(copia)}.` : 'Documento duplicado.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const duplicarModelo = async (m: ModeloDocumento) => {
    try {
      await servicoGerador.duplicarModelo(m.id);
      recarregarModelos();
      notificar('Modelo duplicado. Você pode editá-lo na lista.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const excluirModelo = async (m: ModeloDocumento) => {
    const aviso = m.usos ? ` Os ${m.usos} documento(s) já gerados continuam como estão.` : '';
    if (!(await confirmar(`Excluir o modelo "${m.nome}"?${aviso}`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoGerador.excluirModelo(m.id);
      recarregarModelos();
      notificar('Modelo excluído.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const novoDocumento = () => setEscolhendo({ aberto: true, vinculo: null, rotulo: null });
  const semDadosDaInstituicao = instituicao && !instituicao.unidade.endereco && !instituicao.unidade.telefone && !instituicao.unidade.cnpj;

  const lista = (
    <>
      {semDadosDaInstituicao ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Os dados da instituição ainda não foram preenchidos — o cabeçalho dos documentos sai incompleto. Preencha em Administração → Dados da instituição.
        </Alert>
      ) : null}
      {todos.length ? (
        <>
          <TextField
            type="search"
            size="small"
            fullWidth
            placeholder="Buscar por número, pessoa, empresa, assunto…"
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            inputProps={{ 'aria-label': 'Buscar documentos' }}
            sx={{ mb: 1.5 }}
          />
          {porModelo.length > 1 ? (
            <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
              <Chip label={`Todos · ${todos.length}`} color={filtro.modeloId === null ? 'primary' : 'default'} onClick={() => setFiltro({ ...filtro, modeloId: null })} />
              {porModelo.map(([id, m]) => (
                <Chip key={id} label={`${m.nome} · ${m.n}`} color={filtro.modeloId === id ? 'primary' : 'default'} onClick={() => setFiltro({ ...filtro, modeloId: filtro.modeloId === id ? null : id })} />
              ))}
            </Stack>
          ) : null}
        </>
      ) : null}
      {carregando && !documentos ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {documentos ? (
        <ListaDocumentosGerados
          documentos={filtrados}
          total={todos.length}
          filtroModelo={filtro.modeloId}
          aoFiltrarModelo={(id) => setFiltro({ ...filtro, modeloId: id })}
          selecionadoId={selecionado?.id ?? null}
          podeAlterar={alterar}
          aoAbrir={(d) => (selecionado?.id === d.id && !celular ? setSelecionado(null) : abrir(d.id))}
          aoNovo={novoDocumento}
        />
      ) : null}
    </>
  );

  const detalhe = selecionado ? (
    <DetalheDocumentoGerado
      documento={selecionado}
      instituicao={instituicao}
      podeAlterar={alterar}
      aoAtualizar={(d) => {
        setSelecionado(d);
        recarregarDocumentos();
      }}
      aoVer={(versao) => setVisualizando({ html: htmlDe(selecionado, versao), titulo: rotuloDe(selecionado, versao), versao: versao ?? null })}
      aoPdf={() => pdf(selecionado)}
      aoImprimir={() => imprimirDoc(selecionado)}
      aoEditar={() => setFormulario({ aberto: true, modelo: null, documento: selecionado, vinculo: null })}
      aoDuplicar={() => duplicar(selecionado)}
      aoExcluir={() => excluir(selecionado)}
      aoAbrirVinculo={() => selecionado.vinculoTipo && selecionado.vinculoId && navegar(ROTA_VINCULO[selecionado.vinculoTipo](selecionado.vinculoId))}
      aoFechar={() => setSelecionado(null)}
    />
  ) : null;

  return (
    <Pagina>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <Tabs value={aba} onChange={(_, v: Aba) => setAba(v)} variant="scrollable" scrollButtons={false}>
          <Tab value="documentos" label={`Documentos${documentos ? ` (${todos.length})` : ''}`} />
          <Tab value="modelos" label={`Modelos${modelos ? ` (${modelos.length})` : ''}`} />
        </Tabs>
        {alterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={novoDocumento}>
            Novo documento
          </Button>
        ) : null}
      </Stack>

      {aba === 'modelos' ? (
        modelos ? (
          <ListaModelos
            modelos={modelos}
            podeAlterar={alterar}
            aoUsar={(modelo) => setFormulario({ aberto: true, modelo, documento: null, vinculo: null })}
            aoEditar={(modelo) => setEditandoModelo({ aberto: true, modelo })}
            aoDuplicar={duplicarModelo}
            aoExcluir={excluirModelo}
            aoNovo={() => setEditandoModelo({ aberto: true, modelo: null })}
          />
        ) : (
          <LinearProgress />
        )
      ) : celular && detalhe ? (
        detalhe
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={detalhe ? 7 : 12} lg={detalhe ? 8 : 12}>
            {lista}
          </Grid>
          {detalhe ? (
            <Grid item xs={12} md={5} lg={4}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 90 } }}>{detalhe}</Box>
            </Grid>
          ) : null}
        </Grid>
      )}

      <DialogoEscolherModelo
        aberto={escolhendo.aberto}
        modelos={modelos ?? []}
        para={escolhendo.rotulo}
        aoFechar={() => setEscolhendo({ aberto: false, vinculo: null, rotulo: null })}
        aoEscolher={(modelo) => {
          setFormulario({ aberto: true, modelo, documento: null, vinculo: escolhendo.vinculo });
          setEscolhendo({ aberto: false, vinculo: null, rotulo: null });
        }}
      />
      <FormularioGerador
        aberto={formulario.aberto}
        modelo={formulario.modelo}
        documento={formulario.documento}
        vinculoInicial={formulario.vinculo}
        instituicao={instituicao}
        aoFechar={() => setFormulario((f) => ({ ...f, aberto: false }))}
        aoSalvar={depoisDeSalvar}
      />
      <FormularioModelo
        aberto={editandoModelo.aberto}
        modelo={editandoModelo.modelo}
        aoFechar={() => setEditandoModelo((e) => ({ ...e, aberto: false }))}
        aoSalvar={(_, novo) => {
          recarregarModelos();
          notificar(novo ? 'Modelo criado.' : 'Modelo atualizado.');
        }}
      />
      <DialogoVisualizar
        titulo={visualizando?.titulo ?? ''}
        html={visualizando?.html ?? null}
        somenteConsulta={!!visualizando?.versao}
        aoEditar={() => {
          setVisualizando(null);
          if (selecionado) setFormulario({ aberto: true, modelo: null, documento: selecionado, vinculo: null });
        }}
        aoImprimir={() => selecionado && imprimirDoc(selecionado, visualizando?.versao ?? undefined)}
        aoPdf={() => selecionado && pdf(selecionado, visualizando?.versao ?? undefined)}
        aoFechar={() => setVisualizando(null)}
      />
    </Pagina>
  );
};

export default Gerador;

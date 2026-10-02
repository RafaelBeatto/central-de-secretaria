import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Grid, LinearProgress, MenuItem, Stack, TextField, Theme, useMediaQuery } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import ListaDocumentos from 'src/components/apps/documentos/ListaDocumentos';
import DetalheDocumento from 'src/components/apps/documentos/DetalheDocumento';
import FormularioDocumento from 'src/components/apps/documentos/FormularioDocumento';
import DialogoRenovarDocumento from 'src/components/apps/documentos/DialogoRenovarDocumento';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoDocumentos } from 'src/servicos/documentos';
import { CategoriaDocumento, Documento, ExigenciaApae, ROTULO_CATEGORIA_DOCUMENTO, ROTULO_EXIGENCIA_APAE } from 'src/types/documentos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, normalizar } from 'src/utils/formatacao';
import { useSelector } from 'src/store/Store';

/** Documentos da instituição e quando renovar (old/js/06-documentos.js). Aceita ?documento=ID. */
const Documentos = () => {
  const { podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.DOCUMENTO_ESCREVER);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const { dados: documentos, carregando, erro, definirDados } = useConsulta(servicoDocumentos.listar);
  const [selecionado, setSelecionado] = useState<Documento | null>(null);
  const [filtro, setFiltro] = useState({ busca: '', categoria: '', responsavel: '' });
  const [formulario, setFormulario] = useState<{ aberto: boolean; documento: Documento | null; exigencia?: ExigenciaApae | null }>({ aberto: false, documento: null });
  const [renovando, setRenovando] = useState<Documento | null>(null);

  useEffect(() => setSelecionado(null), [unidadeVisualizadaId]);

  /** O detalhe traz as versões anteriores; a lista não. */
  const abrir = useCallback(
    async (id: number) => {
      try {
        setSelecionado(await servicoDocumentos.detalhe(id));
      } catch (e) {
        notificar(mensagemDeErro(e), 'error');
      }
    },
    [notificar],
  );

  // Vindo da Agenda (ou de outra tela): /documentos?documento=ID abre o detalhe.
  const [parametros, setParametros] = useSearchParams();
  const documentoPedido = Number(parametros.get('documento')) || null;
  useEffect(() => {
    if (!documentoPedido) return;
    abrir(documentoPedido);
    setParametros({}, { replace: true });
  }, [documentoPedido, abrir, setParametros]);

  // Vindo de "Documentação da APAE" num projeto: /documentos?exigencia=CNPJ abre o cadastro já marcado.
  const exigenciaPedida = parametros.get('exigencia') as ExigenciaApae | null;
  useEffect(() => {
    if (!exigenciaPedida || !(exigenciaPedida in ROTULO_EXIGENCIA_APAE)) return;
    if (alterar) setFormulario({ aberto: true, documento: null, exigencia: exigenciaPedida });
    setParametros({}, { replace: true });
  }, [exigenciaPedida, alterar, setParametros]);

  const substituir = (d: Documento) => {
    definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== d.id), d]);
    setSelecionado(d);
  };

  const excluir = async (d: Documento) => {
    const arquivosVersoes = d.versoes.filter((v) => v.arquivoId).length;
    const arquivos = arquivosVersoes
      ? ` O arquivo e os ${arquivosVersoes} arquivo(s) das versões anteriores também serão removidos.`
      : d.arquivoId
        ? ' O arquivo anexado também será removido.'
        : '';
    if (!(await confirmar(`Excluir "${d.nome}"?${arquivos}`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoDocumentos.excluir(d.id);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== d.id));
      setSelecionado(null);
      notificar('Documento excluído.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const todos = useMemo(() => documentos ?? [], [documentos]);
  const responsaveis = useMemo(
    () => [...new Set(todos.map((d) => d.responsavel).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [todos],
  );
  const filtrados = useMemo(() => {
    const q = normalizar(filtro.busca);
    return todos.filter(
      (d) =>
        (!q ||
          normalizar(
            [d.codigo, d.nome, d.numero, d.orgao, d.responsavel, ROTULO_CATEGORIA_DOCUMENTO[d.categoria], d.descricao, d.tags, d.localGuardado].join(' '),
          ).includes(q)) &&
        (!filtro.categoria || d.categoria === filtro.categoria) &&
        (!filtro.responsavel || d.responsavel === filtro.responsavel),
    );
  }, [todos, filtro]);

  const novo = () => setFormulario({ aberto: true, documento: null });

  const lista = (
    <>
      {todos.length ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
          <TextField
            type="search"
            size="small"
            placeholder="Buscar por nome, número, órgão…"
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            inputProps={{ 'aria-label': 'Buscar documento' }}
            sx={{ flexGrow: 1 }}
          />
          <TextField select size="small" value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })} sx={{ minWidth: 200 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Categoria' }}>
            <MenuItem value="">Todas as categorias</MenuItem>
            {(Object.keys(ROTULO_CATEGORIA_DOCUMENTO) as CategoriaDocumento[]).map((c) => (
              <MenuItem key={c} value={c}>
                {ROTULO_CATEGORIA_DOCUMENTO[c]}
              </MenuItem>
            ))}
          </TextField>
          {responsaveis.length ? (
            <TextField select size="small" value={filtro.responsavel} onChange={(e) => setFiltro({ ...filtro, responsavel: e.target.value })} sx={{ minWidth: 200 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Responsável' }}>
              <MenuItem value="">Todos os responsáveis</MenuItem>
              {responsaveis.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {alterar ? (
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={novo} sx={{ flexShrink: 0 }}>
              Novo documento
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {carregando && !documentos ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {documentos ? (
        <ListaDocumentos
          documentos={filtrados}
          total={todos.length}
          selecionadoId={selecionado?.id ?? null}
          podeAlterar={alterar}
          aoAbrir={(d) => (selecionado?.id === d.id && !celular ? setSelecionado(null) : abrir(d.id))}
          aoRenovar={setRenovando}
          aoNovo={novo}
        />
      ) : null}
    </>
  );

  const detalhe = selecionado ? (
    <DetalheDocumento
      documento={selecionado}
      podeAlterar={alterar}
      aoRenovar={() => setRenovando(selecionado)}
      aoEditar={() => setFormulario({ aberto: true, documento: selecionado })}
      aoExcluir={() => excluir(selecionado)}
      aoFechar={() => setSelecionado(null)}
    />
  ) : null;

  return (
    <Pagina>
      {celular && detalhe ? (
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

      <FormularioDocumento
        aberto={formulario.aberto}
        documento={formulario.documento}
        exigenciaInicial={formulario.exigencia}
        responsaveis={responsaveis}
        aoFechar={() => setFormulario({ aberto: false, documento: null })}
        aoSalvar={(d, novoDoc) => {
          substituir(d);
          notificar(novoDoc ? 'Documento cadastrado.' : 'Documento atualizado.');
        }}
      />
      <DialogoRenovarDocumento
        documento={renovando}
        aoFechar={() => setRenovando(null)}
        aoRenovar={(d) => {
          substituir(d);
          notificar(`Renovado até ${formatarData(d.dataValidade)}.`);
        }}
      />
    </Pagina>
  );
};

export default Documentos;

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Grid, LinearProgress, MenuItem, Stack, TextField, Theme, Typography, useMediaQuery } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import FichaEmpresa from 'src/components/apps/empresas/FichaEmpresa';
import FormularioEmpresa from 'src/components/apps/empresas/FormularioEmpresa';
import DialogoDocumentoEmpresa from 'src/components/apps/empresas/DialogoDocumentoEmpresa';
import LinhaEmpresa from 'src/components/apps/empresas/LinhaEmpresa';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoEmpresas } from 'src/servicos/empresas';
import type { Empresa, EmpresaDocumento } from 'src/types/empresas';
import { situacaoEmpresa } from 'src/utils/documentos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { useSelector } from 'src/store/Store';

const FILTROS_SITUACAO = [
  { valor: '', rotulo: 'Qualquer situação' },
  { valor: 'success', rotulo: 'Documentação OK' },
  { valor: 'warning', rotulo: 'Documentação incompleta' },
  { valor: 'error', rotulo: 'Documento vencido' },
];

/** Fornecedores: cadastro único por unidade, com documentos e situação (old: ficha global da empresa). */
const Empresas = () => {
  const { podeAlterar, tem } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.EMPRESA_ESCREVER);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const { dados: empresas, carregando, erro, definirDados } = useConsulta(servicoEmpresas.listar);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState({ busca: '', situacao: '' });
  const [formulario, setFormulario] = useState<{ aberto: boolean; empresa: Empresa | null }>({ aberto: false, empresa: null });
  const [novoDocumentoPara, setNovoDocumentoPara] = useState<Empresa | null>(null);

  useEffect(() => setSelecionadaId(null), [unidadeVisualizadaId]);

  // Vindo de um projeto: /empresas?empresa=ID abre a ficha.
  const [parametros, setParametros] = useSearchParams();
  const empresaPedida = Number(parametros.get('empresa')) || null;
  useEffect(() => {
    if (!empresaPedida) return;
    setSelecionadaId(empresaPedida);
    setParametros({}, { replace: true });
  }, [empresaPedida, setParametros]);

  const todas = useMemo(() => [...(empresas ?? [])].sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR')), [empresas]);
  const selecionada = todas.find((e) => e.id === selecionadaId) ?? null;
  const filtradas = useMemo(() => {
    const q = normalizar(filtro.busca);
    return todas.filter(
      (e) =>
        (!q || normalizar([e.razaoSocial, e.nomeFantasia, e.cnpj, e.municipio, e.representante].join(' ')).includes(q)) &&
        (!filtro.situacao || situacaoEmpresa(e).tom === filtro.situacao),
    );
  }, [todas, filtro]);

  const substituir = (e: Empresa) => definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== e.id), e]);

  const excluir = async (e: Empresa) => {
    const docs = e.documentos.length;
    const aviso = docs ? ` Os ${docs} documento(s) da ficha também serão removidos.` : '';
    if (!(await confirmar(`Excluir a empresa "${e.razaoSocial}"?${aviso}`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoEmpresas.excluir(e.id);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== e.id));
      setSelecionadaId(null);
      notificar('Empresa excluída.');
    } catch (err) {
      notificar(mensagemDeErro(err), 'error');
    }
  };

  const excluirDocumento = async (e: Empresa, d: EmpresaDocumento) => {
    if (!(await confirmar(`Excluir o documento "${d.nome}" da empresa?`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      substituir(await servicoEmpresas.excluirDocumento(e.id, d.id));
      notificar('Documento excluído.');
    } catch (err) {
      notificar(mensagemDeErro(err), 'error');
    }
  };

  const novo = () => setFormulario({ aberto: true, empresa: null });

  const lista = (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={3}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar por nome, CNPJ, município…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar empresa' }}
          sx={{ flexGrow: 1 }}
        />
        <TextField select size="small" value={filtro.situacao} onChange={(e) => setFiltro({ ...filtro, situacao: e.target.value })} sx={{ minWidth: 220 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Situação' }}>
          {FILTROS_SITUACAO.map((s) => (
            <MenuItem key={s.valor} value={s.valor}>
              {s.rotulo}
            </MenuItem>
          ))}
        </TextField>
        {alterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={novo} sx={{ flexShrink: 0 }}>
            Nova empresa
          </Button>
        ) : null}
      </Stack>
      {carregando && !empresas ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {empresas && !todas.length ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6">Nenhuma empresa cadastrada</Typography>
          <Typography color="textSecondary">
            Cadastre aqui os fornecedores uma vez só: os dados e os documentos deles valem para todos os projetos e documentos gerados.
          </Typography>
        </Box>
      ) : null}
      {todas.length > 0 && !filtradas.length ? <Typography color="textSecondary">Nenhuma empresa com esses filtros.</Typography> : null}
      {filtradas.map((e) => (
        <LinhaEmpresa key={e.id} empresa={e} selecionada={e.id === selecionadaId} aoAbrir={() => setSelecionadaId((atual) => (atual === e.id && !celular ? null : e.id))} />
      ))}
    </>
  );

  const detalhe = selecionada ? (
    <FichaEmpresa
      empresa={selecionada}
      podeAlterar={alterar}
      verProjetos={tem(PERMISSOES.PROJETO_LER)}
      ligarProjetos={podeAlterar(PERMISSOES.PROJETO_ESCREVER)}
      aoEditar={() => setFormulario({ aberto: true, empresa: selecionada })}
      aoExcluir={() => excluir(selecionada)}
      aoNovoDocumento={() => setNovoDocumentoPara(selecionada)}
      aoExcluirDocumento={(d) => excluirDocumento(selecionada, d)}
      aoFechar={() => setSelecionadaId(null)}
    />
  ) : null;

  return (
    <Pagina>
      {celular && detalhe ? (
        detalhe
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={detalhe ? 6 : 12} lg={detalhe ? 7 : 12}>
            {lista}
          </Grid>
          {detalhe ? (
            <Grid item xs={12} md={6} lg={5}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 90 } }}>{detalhe}</Box>
            </Grid>
          ) : null}
        </Grid>
      )}

      <FormularioEmpresa
        aberto={formulario.aberto}
        empresa={formulario.empresa}
        aoFechar={() => setFormulario({ aberto: false, empresa: null })}
        aoSalvar={({ empresa, jaExistia }) => {
          substituir(empresa);
          setSelecionadaId(empresa.id);
          if (jaExistia) notificar(`"${empresa.razaoSocial}" já está cadastrada.`, 'info');
          else notificar(formulario.empresa ? 'Empresa atualizada.' : 'Empresa cadastrada.');
        }}
      />
      <DialogoDocumentoEmpresa
        empresa={novoDocumentoPara}
        aoFechar={() => setNovoDocumentoPara(null)}
        aoSalvar={(e) => {
          substituir(e);
          notificar('Documento adicionado.');
        }}
      />
    </Pagina>
  );
};

export default Empresas;

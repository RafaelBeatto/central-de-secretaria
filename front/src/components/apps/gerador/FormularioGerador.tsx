import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { IconPlus, IconX } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { LIMITES } from 'src/constantes/limites';
import { servicoGerador } from 'src/servicos/gerador';
import type { Campos, DocumentoGerado, ModeloDocumento, RegistroVinculo, RequisicaoDocumentoGerado, TipoVinculo } from 'src/types/gerador';
import { ROTULO_VINCULO } from 'src/types/gerador';
import { hojeIso } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import {
  camposAutomaticos,
  CAMPOS_LONGOS,
  classificarChaves,
  extrairManuais,
  InstituicaoCarregada,
  montarHtmlDocumento,
  nomeDocumento,
  rotuloCampo,
} from 'src/utils/gerador';
import { listarRegistros } from 'src/utils/geradorVinculos';
import PaginaA4Previa from './PaginaA4Previa';

export interface VinculoInicial {
  tipo: TipoVinculo;
  id: number;
}

interface Props {
  aberto: boolean;
  /** Modelo do documento novo. */
  modelo: ModeloDocumento | null;
  /** Documento a editar (salvar cria a próxima versão). */
  documento: DocumentoGerado | null;
  vinculoInicial?: VinculoInicial | null;
  instituicao: InstituicaoCarregada | undefined;
  aoFechar: () => void;
  aoSalvar: (d: DocumentoGerado, novo: boolean) => void;
}

interface Campo {
  nome: string;
  tipo: 'contexto' | 'valor';
}

/** Preencher o documento com a prévia ao vivo (old: abrirFormularioGerador). */
const FormularioGerador = ({ aberto, modelo, documento, vinculoInicial, instituicao, aoFechar, aoSalvar }: Props) => {
  const { notificar } = useInteracao();
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const texto = documento?.texto ?? modelo?.texto ?? '';
  const formato = documento?.formato ?? modelo?.formato ?? 'HTML';
  const dataGeracao = documento?.dataGeracao ?? hojeIso();
  const numero = documento ? documento.numero : (modelo?.proximoNumero ?? null);
  const titulo = documento?.titulo || documento?.modeloNome || modelo?.titulo || modelo?.nome || '';
  const espacamento = documento ? documento.espacamento : (modelo?.espacamento ?? null);

  const automaticos = useMemo(() => camposAutomaticos(instituicao?.unidade, dataGeracao, numero), [instituicao, dataGeracao, numero]);
  const campos: Campo[] = useMemo(
    () => [
      ...classificarChaves(texto).contexto.map((nome): Campo => ({ nome, tipo: 'contexto' })),
      ...extrairManuais(texto).map((nome): Campo => ({ nome, tipo: 'valor' })),
    ],
    [texto],
  );
  const faltaConfig = classificarChaves(texto).automaticos.filter((c) => c !== 'NUMERO' && !automaticos[c]);

  const [valores, setValores] = useState<Campos>({});
  const [contexto, setContexto] = useState<Campos>({});
  const [assinaturas, setAssinaturas] = useState<string[]>([]);
  const [vinculoTipo, setVinculoTipo] = useState<TipoVinculo | ''>('');
  const [vinculo, setVinculo] = useState<RegistroVinculo | null>(null);
  const [registros, setRegistros] = useState<RegistroVinculo[]>([]);
  const [carregandoRegistros, setCarregandoRegistros] = useState(false);
  const [erroRegistros, setErroRegistros] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Abre sempre do zero: com o documento (edição) ou em branco (novo, com o vínculo vindo de outra tela).
  useEffect(() => {
    if (!aberto) return;
    setValores(documento?.valores ?? {});
    setContexto(documento?.contexto ?? {});
    setAssinaturas((documento?.assinaturas ?? []).map((l) => l.join('\n')));
    setVinculoTipo(documento?.vinculoTipo ?? vinculoInicial?.tipo ?? '');
    setVinculo(documento?.vinculoId ? { id: documento.vinculoId, rotulo: documento.vinculoRotulo ?? '—', dados: async () => ({}) } : null);
    setErro(null);
  }, [aberto, documento, vinculoInicial]);

  const preencherCom = async (registro: RegistroVinculo) => {
    try {
      const dados = await registro.dados();
      let n = 0;
      const completar = (atual: Campos, tipo: Campo['tipo']) => {
        const novo = { ...atual };
        campos
          .filter((c) => c.tipo === tipo)
          .forEach((c) => {
            if (!novo[c.nome]?.trim() && dados[c.nome]) {
              novo[c.nome] = dados[c.nome].slice(0, LIMITES.GERADOR_CAMPO_VALOR);
              n++;
            }
          });
        return novo;
      };
      setValores((v) => completar(v, 'valor'));
      setContexto((c) => completar(c, 'contexto'));
      if (n) notificar(`${n} campo(s) preenchido(s) com os dados do registro.`);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  // Lista de registros do tipo escolhido; vindo de outra tela (ex.: ficha da empresa) já escolhe e preenche.
  useEffect(() => {
    if (!aberto || !vinculoTipo) {
      setRegistros([]);
      return;
    }
    let ativo = true;
    setCarregandoRegistros(true);
    setErroRegistros(false);
    listarRegistros(vinculoTipo)
      .then((lista) => {
        if (!ativo) return;
        setRegistros(lista);
        const inicial = !documento && vinculoInicial?.tipo === vinculoTipo ? lista.find((r) => r.id === vinculoInicial.id) : undefined;
        if (inicial) {
          setVinculo(inicial);
          preencherCom(inicial);
        }
      })
      .catch(() => ativo && setErroRegistros(true))
      .finally(() => ativo && setCarregandoRegistros(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, vinculoTipo]);

  const assinaturasLimpas = useMemo(
    () => assinaturas.map((a) => a.split('\n').map((l) => l.trim()).filter(Boolean)).filter((l) => l.length),
    [assinaturas],
  );

  const html = useDeferredValue(
    useMemo(
      () =>
        montarHtmlDocumento({ titulo, texto, formato, espacamento, dataGeracao, numero, valores, contexto, assinaturas: assinaturasLimpas }, instituicao, true),
      [titulo, texto, formato, espacamento, dataGeracao, numero, valores, contexto, assinaturasLimpas, instituicao],
    ),
  );

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    const requisicao: RequisicaoDocumentoGerado = {
      modeloId: modelo?.id,
      valores,
      contexto,
      assinaturas: assinaturasLimpas,
      vinculoTipo: vinculoTipo && vinculo ? vinculoTipo : null,
      vinculoId: vinculoTipo && vinculo ? vinculo.id : null,
      vinculoRotulo: vinculoTipo && vinculo ? vinculo.rotulo.slice(0, LIMITES.GERADOR_VINCULO_ROTULO) : null,
    };
    try {
      const salvo = documento ? await servicoGerador.atualizar(documento.id, requisicao) : await servicoGerador.gerar(requisicao);
      aoSalvar(salvo, !documento);
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (c: Campo) => {
    const mapa = c.tipo === 'valor' ? valores : contexto;
    const definir = c.tipo === 'valor' ? setValores : setContexto;
    const id = `campo-${c.tipo}-${c.nome}`;
    return (
      <Grid item xs={12} key={id}>
        <CustomFormLabel htmlFor={id} sx={{ mt: 0 }}>
          {rotuloCampo(c.nome)}
        </CustomFormLabel>
        <CustomTextField
          id={id}
          fullWidth
          multiline={CAMPOS_LONGOS.includes(c.nome)}
          minRows={CAMPOS_LONGOS.includes(c.nome) ? 4 : undefined}
          value={mapa[c.nome] ?? ''}
          inputProps={{ maxLength: LIMITES.GERADOR_CAMPO_VALOR }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => definir((v) => ({ ...v, [c.nome]: e.target.value }))}
        />
      </Grid>
    );
  };

  const nome = documento ? nomeDocumento(documento) : modelo ? `${modelo.nome}${numero ? ` nº ${numero}` : ''}` : '';

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xl" fullScreen={celular} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        {documento ? `Editar ${nome}` : `Novo: ${nome}`}
        <IconButton aria-label="Fechar" onClick={aoFechar} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            {erro ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {erro}
              </Alert>
            ) : null}
            {documento ? (
              <Alert severity="info" icon={false} sx={{ mb: 2 }}>
                Salvar cria a <b>versão {documento.versao + 1}</b>; a atual continua guardada.
              </Alert>
            ) : null}
            {faltaConfig.length ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Faltam dados da instituição usados neste modelo: {faltaConfig.map(rotuloCampo).join(', ')}. Preencha em Administração → Dados da instituição.
              </Alert>
            ) : null}

            <Typography variant="subtitle2" mb={0.5}>
              Ligar a um registro <Typography component="span" variant="caption" color="textSecondary">(preenche os campos sozinho)</Typography>
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
              <TextField
                select
                size="small"
                value={vinculoTipo}
                onChange={(e) => {
                  setVinculoTipo(e.target.value as TipoVinculo | '');
                  setVinculo(null);
                }}
                SelectProps={{ displayEmpty: true }}
                inputProps={{ 'aria-label': 'Tipo de registro' }}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {(Object.keys(ROTULO_VINCULO) as TipoVinculo[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {ROTULO_VINCULO[t]}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                size="small"
                fullWidth
                disabled={!vinculoTipo}
                options={registros}
                value={vinculo}
                loading={carregandoRegistros}
                loadingText="Carregando…"
                noOptionsText={erroRegistros ? 'Você não tem acesso a esta lista.' : 'Nenhum registro'}
                getOptionLabel={(r) => r.rotulo}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, r) => {
                  setVinculo(r);
                  if (r) preencherCom(r);
                }}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    placeholder={vinculoTipo ? 'Escolha…' : '—'}
                    InputProps={{
                      ...p.InputProps,
                      endAdornment: (
                        <>
                          {carregandoRegistros ? <CircularProgress size={16} /> : null}
                          {p.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Stack>

            {campos.length ? (
              <Grid container spacing={2}>
                {campos.map(campo)}
              </Grid>
            ) : (
              <Typography color="textSecondary">Este modelo não tem campos para preencher.</Typography>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3} mb={1}>
              <Typography variant="subtitle2">Assinaturas</Typography>
              <Stack direction="row" spacing={1}>
                {instituicao?.unidade.presidente ? (
                  <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => setAssinaturas((a) => [...a, `${instituicao.unidade.presidente}\nPresidente`])}>
                    Presidente
                  </Button>
                ) : null}
                <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => setAssinaturas((a) => [...a, ''])}>
                  Assinatura
                </Button>
              </Stack>
            </Stack>
            {assinaturas.length ? (
              assinaturas.map((a, i) => (
                <Stack key={i} direction="row" spacing={1} mb={1} alignItems="flex-start">
                  <CustomTextField
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder={'Nome\nCargo'}
                    value={a}
                    inputProps={{ 'aria-label': `Assinatura ${i + 1}`, maxLength: LIMITES.GERADOR_ASSINATURA_LINHA * LIMITES.GERADOR_ASSINATURA_LINHAS_MAXIMO }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssinaturas((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <IconButton aria-label="Remover assinatura" size="small" onClick={() => setAssinaturas((l) => l.filter((_, j) => j !== i))}>
                    <IconX size={16} />
                  </IconButton>
                </Stack>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                Sem assinatura.
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" mb={1}>
              Prévia <Typography component="span" variant="caption" color="textSecondary">os campos em amarelo ainda estão vazios</Typography>
            </Typography>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 0 } }}>
              <PaginaA4Previa html={html} />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={enviando} onClick={enviar}>
          {enviando ? 'Salvando…' : documento ? `Salvar versão ${documento.versao + 1}` : 'Gerar documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioGerador;

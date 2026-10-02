import { useEffect, useState } from 'react';
import { Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { IconLink, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { CodigoPermissao, PERMISSOES } from 'src/constantes/permissoes';
import { usePermissao } from 'src/hooks/usePermissao';
import { servicoVinculos } from 'src/servicos/vinculos';
import { destinoDoVinculo, podeLigar, ROTULO_TIPO_REGISTRO, ROTULO_UM_REGISTRO, TipoRegistro, Vinculado } from 'src/types/vinculos';
import { mensagemDeErro } from 'src/utils/erroApi';

const PERMISSAO: Record<TipoRegistro, { ler: CodigoPermissao; escrever: CodigoPermissao }> = {
  TAREFA: { ler: PERMISSOES.TAREFA_LER, escrever: PERMISSOES.TAREFA_ESCREVER },
  DOCUMENTO: { ler: PERMISSOES.DOCUMENTO_LER, escrever: PERMISSOES.DOCUMENTO_ESCREVER },
  EMPRESA: { ler: PERMISSOES.EMPRESA_LER, escrever: PERMISSOES.EMPRESA_ESCREVER },
  EXECUCAO: { ler: PERMISSOES.PROJETO_LER, escrever: PERMISSOES.PROJETO_ESCREVER },
};
const TIPOS: TipoRegistro[] = ['EXECUCAO', 'EMPRESA', 'DOCUMENTO', 'TAREFA'];

interface Props {
  tipo: TipoRegistro;
  id: number;
}

/**
 * "Relacionados" no detalhe de tarefa, documento, empresa e execução: registros ligados a este,
 * com "Abrir", remover e "Vincular…" (old: renderRelacionados / renderSelectorRelacionados).
 */
const Relacionados = ({ tipo, id }: Props) => {
  const navegar = useNavigate();
  const { notificar, confirmar } = useInteracao();
  const { tem, podeAlterar } = usePermissao();
  const [itens, setItens] = useState<Vinculado[] | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const [alvo, setAlvo] = useState<TipoRegistro | null>(null);
  const [opcoes, setOpcoes] = useState<Vinculado[]>([]);
  const [escolhido, setEscolhido] = useState<Vinculado | null>(null);

  const podeEditar = podeAlterar(PERMISSAO[tipo].escrever);
  const alvos = TIPOS.filter((t) => podeLigar(tipo, t) && tem(PERMISSAO[t].ler));

  useEffect(() => {
    let ativo = true;
    setItens(null);
    servicoVinculos
      .doRegistro(tipo, id)
      .then((lista) => ativo && setItens(lista))
      .catch(() => ativo && setItens([]));
    return () => {
      ativo = false;
    };
  }, [tipo, id]);

  useEffect(() => {
    if (!vinculando || !alvo) return;
    setEscolhido(null);
    servicoVinculos.opcoes(tipo, id, alvo).then(setOpcoes).catch((e) => notificar(mensagemDeErro(e), 'error'));
  }, [vinculando, alvo, tipo, id, notificar]);

  const abrirDialogo = () => {
    setAlvo(alvos[0] ?? null);
    setEscolhido(null);
    setVinculando(true);
  };

  const vincular = async () => {
    if (!alvo || !escolhido) return;
    try {
      setItens(await servicoVinculos.adicionar(tipo, id, alvo, escolhido.id));
      setVinculando(false);
      notificar('Vínculo adicionado.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const remover = async (v: Vinculado) => {
    if (!(await confirmar(`Remover o vínculo com "${v.titulo}"?`, { rotuloConfirmar: 'Remover' }))) return;
    try {
      setItens(await servicoVinculos.remover(tipo, id, v.tipo, v.id));
      notificar('Vínculo removido.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  if (!itens || (!itens.length && (!podeEditar || !alvos.length))) return null;

  const grupos = TIPOS.filter((t) => itens.some((v) => v.tipo === t));
  return (
    <Box mt={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Relacionados</Typography>
        {podeEditar && alvos.length ? (
          <Button size="small" startIcon={<IconLink size={16} />} onClick={abrirDialogo}>
            Vincular…
          </Button>
        ) : null}
      </Stack>
      {!itens.length ? (
        <Typography variant="body2" color="textSecondary">
          Nada ligado a este registro ainda.
        </Typography>
      ) : null}
      {grupos.map((g) => (
        <Box key={g} mb={1}>
          <Typography variant="caption" color="textSecondary">
            {ROTULO_TIPO_REGISTRO[g]}
          </Typography>
          {itens
            .filter((v) => v.tipo === g)
            .map((v) => (
              <Stack key={`${v.tipo}-${v.id}`} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5, borderTop: 1, borderColor: 'divider' }}>
                <Box minWidth={0}>
                  <Typography variant="subtitle2">{v.titulo}</Typography>
                  {v.detalhe ? (
                    <Typography variant="caption" color="textSecondary">
                      {v.detalhe}
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                  <Button size="small" onClick={() => navegar(destinoDoVinculo(v))}>
                    Abrir
                  </Button>
                  {podeEditar ? (
                    <Tooltip title="Remover vínculo">
                      <IconButton size="small" aria-label={`Remover vínculo com ${v.titulo}`} onClick={() => remover(v)}>
                        <IconX size={16} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Stack>
            ))}
        </Box>
      ))}

      <Dialog open={vinculando} onClose={() => setVinculando(false)} fullWidth maxWidth="xs">
        <DialogTitle>Vincular a outro registro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select SelectProps={{ native: true }} label="Tipo" value={alvo ?? ''} onChange={(e) => setAlvo(e.target.value as TipoRegistro)}>
              {alvos.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_REGISTRO[t]}
                </option>
              ))}
            </TextField>
            <Autocomplete
              options={opcoes}
              value={escolhido}
              onChange={(_, v) => setEscolhido(v)}
              getOptionLabel={(o) => (o.detalhe ? `${o.titulo} · ${o.detalhe}` : o.titulo)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={alvo ? `Nenhum(a) ${ROTULO_UM_REGISTRO[alvo]} disponível para vincular.` : 'Escolha um tipo'}
              renderInput={(p) => <TextField {...p} label="Registro" autoFocus />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVinculando(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!escolhido} onClick={vincular}>
            Vincular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Relacionados;

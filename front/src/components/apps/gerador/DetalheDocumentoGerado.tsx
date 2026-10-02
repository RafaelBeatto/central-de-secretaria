import { ChangeEvent, useMemo, useState } from 'react';
import { Box, Button, ButtonBase, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { IconArrowLeft, IconCopy, IconDownload, IconEdit, IconLink, IconPaperclip, IconPrinter, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoArquivos } from 'src/servicos/arquivos';
import { servicoGerador } from 'src/servicos/gerador';
import type { DocumentoGerado, VersaoDocumentoGerado } from 'src/types/gerador';
import { ROTULO_VINCULO } from 'src/types/gerador';
import { formatarData, formatarDataHora } from 'src/utils/formatacao';
import { fonteDoDocumento, InstituicaoCarregada, montarHtmlDocumento, nomeDocumento } from 'src/utils/gerador';
import { mensagemDeErro } from 'src/utils/erroApi';
import PaginaA4Previa from './PaginaA4Previa';

const tamanho = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

interface Props {
  documento: DocumentoGerado;
  instituicao: InstituicaoCarregada | undefined;
  podeAlterar: boolean;
  aoAtualizar: (d: DocumentoGerado) => void;
  aoVer: (versao?: VersaoDocumentoGerado) => void;
  aoPdf: () => void;
  aoImprimir: () => void;
  aoEditar: () => void;
  aoDuplicar: () => void;
  aoExcluir: () => void;
  aoAbrirVinculo: () => void;
  aoFechar: () => void;
}

/** Painel ao lado da lista: miniatura, ações, vínculo, anexos, versões e histórico (old: gePainelHTML). */
const DetalheDocumentoGerado = ({ documento: d, instituicao, podeAlterar, aoAtualizar, aoVer, aoPdf, aoImprimir, aoEditar, aoDuplicar, aoExcluir, aoAbrirVinculo, aoFechar }: Props) => {
  const { notificar, confirmar } = useInteracao();
  const [enviando, setEnviando] = useState(false);
  const html = useMemo(() => montarHtmlDocumento(fonteDoDocumento(d), instituicao), [d, instituicao]);

  const anexar = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivos = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!arquivos.length) return;
    setEnviando(true);
    try {
      let atual = d;
      for (const arquivo of arquivos) {
        const enviado = await servicoArquivos.enviar(arquivo, 'ANEXO_GERADOR');
        atual = await servicoGerador.anexar(d.id, enviado.id);
      }
      aoAtualizar(atual);
      notificar(arquivos.length > 1 ? `${arquivos.length} anexos adicionados.` : 'Anexo adicionado.');
    } catch (erro) {
      notificar(mensagemDeErro(erro), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const removerAnexo = async (arquivoId: number, nome: string) => {
    if (!(await confirmar(`Remover o anexo "${nome}"?`, { rotuloConfirmar: 'Remover', perigo: true }))) return;
    try {
      aoAtualizar(await servicoGerador.removerAnexo(d.id, arquivoId));
    } catch (erro) {
      notificar(mensagemDeErro(erro), 'error');
    }
  };

  return (
    <BlankCard>
      <Box p={{ xs: 2, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoFechar} sx={{ display: { md: 'none' } }}>
            Documentos
          </Button>
          <Typography variant="caption" color="textSecondary">
            {d.modeloNome}
          </Typography>
          <IconButton size="small" aria-label="Fechar detalhe" onClick={aoFechar}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
          {nomeDocumento(d)}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Gerado em {formatarData(d.dataGeracao)}
          {d.versao > 1 ? ` · versão ${d.versao}` : ''}
        </Typography>

        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="contained" startIcon={<IconDownload size={16} />} onClick={aoPdf}>
            PDF
          </Button>
          <Button size="small" variant="outlined" startIcon={<IconPrinter size={16} />} onClick={aoImprimir}>
            Imprimir
          </Button>
          {podeAlterar ? (
            <>
              <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
                Editar
              </Button>
              <Button size="small" variant="outlined" startIcon={<IconCopy size={16} />} onClick={aoDuplicar}>
                Duplicar
              </Button>
              <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
                Excluir
              </Button>
            </>
          ) : null}
        </Stack>

        <ButtonBase onClick={() => aoVer()} aria-label="Ver em tamanho real" sx={{ display: 'block', width: '100%', mt: 2, textAlign: 'left' }}>
          <PaginaA4Previa html={html} alturaMaxima={340} />
          <Typography variant="caption" color="textSecondary">
            Clique para ver em tamanho real
          </Typography>
        </ButtonBase>

        {d.vinculoTipo ? (
          <Typography mt={2} sx={{ overflowWrap: 'anywhere' }}>
            <IconLink size={14} style={{ verticalAlign: 'middle' }} /> {ROTULO_VINCULO[d.vinculoTipo]}:{' '}
            <Button size="small" sx={{ p: 0, minWidth: 0, textTransform: 'none' }} onClick={aoAbrirVinculo}>
              {d.vinculoRotulo ?? 'abrir'}
            </Button>
          </Typography>
        ) : null}

        <Typography variant="h6" mt={3} mb={1}>
          Anexos{d.anexos.length ? ` (${d.anexos.length})` : ''}
        </Typography>
        {d.anexos.length ? (
          <List dense disablePadding>
            {d.anexos.map((a) => (
              <ListItem
                key={a.id}
                disableGutters
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" aria-label={`Abrir ${a.nome}`} onClick={() => servicoArquivos.abrir(a.id).catch((erro) => notificar(mensagemDeErro(erro), 'error'))}>
                      <IconDownload size={16} />
                    </IconButton>
                    {podeAlterar ? (
                      <IconButton size="small" color="error" aria-label={`Remover ${a.nome}`} onClick={() => removerAnexo(a.id, a.nome)}>
                        <IconTrash size={16} />
                      </IconButton>
                    ) : null}
                  </Stack>
                }
              >
                <ListItemText primary={a.nome} secondary={tamanho(a.tamanho)} primaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }} sx={{ pr: 8 }} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Nenhum anexo.
          </Typography>
        )}
        {podeAlterar ? (
          <Button component="label" size="small" variant="outlined" startIcon={<IconPaperclip size={16} />} disabled={enviando} sx={{ mt: 1 }}>
            {enviando ? 'Enviando…' : 'Anexar arquivo'}
            <input type="file" hidden multiple onChange={anexar} />
          </Button>
        ) : null}

        {d.versoes.length ? (
          <>
            <Typography variant="h6" mt={3} mb={1}>
              Versões anteriores ({d.versoes.length})
            </Typography>
            <List dense disablePadding>
              {d.versoes.map((v) => (
                <ListItem key={v.versao} disableGutters secondaryAction={<Button size="small" onClick={() => aoVer(v)}>Ver</Button>}>
                  <ListItemText primary={`Versão ${v.versao}`} secondary={formatarDataHora(v.salvoEm)} />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}

        <HistoricoDoRegistro carregar={() => servicoGerador.historico(d.id)} versao={`${d.versao}-${d.anexos.length}`} />
      </Box>
    </BlankCard>
  );
};

export default DetalheDocumentoGerado;

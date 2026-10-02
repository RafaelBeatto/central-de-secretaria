import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconCopy, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import type { ModeloDocumento } from 'src/types/gerador';
import { classificarChaves, extrairManuais } from 'src/utils/gerador';

interface Props {
  modelos: ModeloDocumento[];
  podeAlterar: boolean;
  aoUsar: (m: ModeloDocumento) => void;
  aoEditar: (m: ModeloDocumento) => void;
  aoDuplicar: (m: ModeloDocumento) => void;
  aoExcluir: (m: ModeloDocumento) => void;
  aoNovo: () => void;
}

const contarCampos = (m: ModeloDocumento) => extrairManuais(m.texto).length + classificarChaves(m.texto).contexto.length;

/** Modelos do sistema e da unidade (old: geModelosHTML). Os do sistema só se usam ou duplicam. */
const ListaModelos = ({ modelos, podeAlterar, aoUsar, aoEditar, aoDuplicar, aoExcluir, aoNovo }: Props) => {
  const ordenados = [...modelos].sort((a, b) => b.usos - a.usos || a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} mb={2}>
        <Typography color="textSecondary">
          Os campos em <b>[COLCHETES]</b> você preenche na hora; os em <b>{'{CHAVES}'}</b> o sistema preenche (data, número, dados da instituição).
        </Typography>
        {podeAlterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={aoNovo} sx={{ flexShrink: 0 }}>
            Novo modelo
          </Button>
        ) : null}
      </Stack>
      {ordenados.map((m) => {
        const campos = contarCampos(m);
        const info = [
          `${campos} campo${campos === 1 ? '' : 's'} para preencher`,
          m.proximoNumero && `numerado (${m.serie || m.nome} nº ${m.proximoNumero})`,
          m.usos ? `usado ${m.usos}×` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Stack
            key={m.id}
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1 }}
          >
            <Box minWidth={0}>
              <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                {m.nome} {m.doSistema ? <Chip size="small" label="Do sistema" sx={{ ml: 0.5 }} /> : null}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {info}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap flexShrink={0}>
              {podeAlterar ? (
                <Button size="small" variant="contained" onClick={() => aoUsar(m)}>
                  Usar
                </Button>
              ) : null}
              {podeAlterar && !m.doSistema ? (
                <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={() => aoEditar(m)}>
                  Editar
                </Button>
              ) : null}
              {podeAlterar ? (
                <Button size="small" variant="outlined" startIcon={<IconCopy size={16} />} onClick={() => aoDuplicar(m)}>
                  Duplicar
                </Button>
              ) : null}
              {podeAlterar && !m.doSistema ? (
                <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={() => aoExcluir(m)}>
                  Excluir
                </Button>
              ) : null}
            </Stack>
          </Stack>
        );
      })}
    </>
  );
};

export default ListaModelos;

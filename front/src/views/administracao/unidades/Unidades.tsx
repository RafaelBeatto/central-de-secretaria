import { useState } from 'react';
import { Box, Chip, Grid, Typography } from '@mui/material';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import TabelaResponsiva, { Coluna } from 'src/components/compartilhados/TabelaResponsiva';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { LIMITES } from 'src/constantes/limites';
import { servicoUnidades, RequisicaoUnidade } from 'src/servicos/unidades';
import { useDispatch, useSelector } from 'src/store/Store';
import { carregarUnidades } from 'src/store/autenticacao/AutenticacaoSlice';
import type { UnidadeResumo } from 'src/types/acesso';
import { ROTULO_TIPO_UNIDADE } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';
import { useField } from 'formik';

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.UNIDADE_NOME),
  uf: regras.uf(),
  municipio: regras.texto(LIMITES.MUNICIPIO),
});

const CampoAtivo = () => {
  const [campo, , ajudante] = useField<boolean>('ativo');
  return (
    <Box mt={3} display="flex" alignItems="center" gap={1}>
      <CustomSwitch checked={campo.value} onChange={(_: unknown, v: boolean) => ajudante.setValue(v)} inputProps={{ 'aria-label': 'Unidade ativa' }} />
      <Typography>{campo.value ? 'Ativa' : 'Desativada (usuários dela não entram)'}</Typography>
    </Box>
  );
};

type Edicao = { pai: UnidadeResumo; unidade: UnidadeResumo | null } | null;

/** Árvore de unidades que o usuário alcança; cria e edita as subordinadas. */
const Unidades = () => {
  const dispatch = useDispatch();
  const { notificar } = useInteracao();
  const { tem } = usePermissao();
  const { unidades, usuario } = useSelector((s) => s.autenticacao);
  const [edicao, setEdicao] = useState<Edicao>(null);
  const podeEditar = tem(PERMISSOES.UNIDADE_ESCREVER);
  const porId = new Map(unidades.map((u) => [u.id, u]));

  const colunas: Coluna<UnidadeResumo>[] = [
    {
      titulo: 'Unidade',
      principal: true,
      valor: (u) => (
        <Box sx={{ pl: { md: u.profundidade * 3 } }}>
          {u.nome}
          {u.id === usuario?.unidade.id ? <Chip size="small" label="minha" sx={{ ml: 1 }} /> : null}
        </Box>
      ),
    },
    { titulo: 'Nível', valor: (u) => ROTULO_TIPO_UNIDADE[u.tipo] },
    { titulo: 'Local', valor: (u) => [u.municipio, u.uf].filter(Boolean).join(' / ') || '—' },
    { titulo: 'Situação', valor: (u) => <Chip size="small" label={u.ativo ? 'Ativa' : 'Desativada'} color={u.ativo ? 'success' : 'default'} /> },
  ];

  const valoresIniciais: RequisicaoUnidade = {
    unidadePaiId: edicao?.pai.id ?? 0,
    nome: edicao?.unidade?.nome ?? '',
    uf: edicao?.unidade?.uf ?? edicao?.pai.uf ?? '',
    municipio: edicao?.unidade?.municipio ?? '',
    ativo: edicao?.unidade?.ativo ?? true,
  };

  return (
    <Pagina>
      <TabelaResponsiva
        colunas={colunas}
        itens={unidades}
        chave={(u) => u.id}
        vazio="Nenhuma unidade."
        acoes={(u) =>
          podeEditar ? (
            <MenuAcoes
              acoes={[
                {
                  rotulo: u.tipo === 'NACIONAL' ? 'Nova federação estadual' : 'Nova APAE municipal',
                  icone: <IconPlus size={18} />,
                  aoClicar: () => setEdicao({ pai: u, unidade: null }),
                  oculta: u.tipo === 'MUNICIPAL',
                },
                {
                  rotulo: 'Editar',
                  icone: <IconEdit size={18} />,
                  aoClicar: () => setEdicao({ pai: porId.get(u.unidadePaiId!)!, unidade: u }),
                  oculta: u.id === usuario?.unidade.id || !porId.has(u.unidadePaiId ?? -1),
                },
              ]}
            />
          ) : null
        }
      />

      <DialogoFormulario
        aberto={!!edicao}
        titulo={edicao?.unidade ? `Editar ${edicao.unidade.nome}` : `Nova unidade em ${edicao?.pai.nome ?? ''}`}
        valoresIniciais={valoresIniciais}
        esquema={esquema}
        aoFechar={() => setEdicao(null)}
        aoEnviar={async (valores) => {
          if (edicao?.unidade) await servicoUnidades.atualizar(edicao.unidade.id, valores);
          else await servicoUnidades.criar(valores);
          notificar(edicao?.unidade ? 'Unidade atualizada.' : 'Unidade criada.');
          dispatch(carregarUnidades());
        }}
      >
        <Grid container columnSpacing={3}>
          <Grid item xs={12}>
            <CampoFormik name="nome" rotulo="Nome" obrigatorio limite={LIMITES.UNIDADE_NOME} placeholder="Ex.: APAE de Corumbiara" />
          </Grid>
          <Grid item xs={4} sm={3}>
            <CampoFormik name="uf" rotulo="UF" limite={LIMITES.UF} inputProps={{ style: { textTransform: 'uppercase' } }} />
          </Grid>
          <Grid item xs={8} sm={9}>
            <CampoFormik name="municipio" rotulo="Município" limite={LIMITES.MUNICIPIO} />
          </Grid>
          <Grid item xs={12}>
            <CampoAtivo />
          </Grid>
        </Grid>
      </DialogoFormulario>
    </Pagina>
  );
};

export default Unidades;

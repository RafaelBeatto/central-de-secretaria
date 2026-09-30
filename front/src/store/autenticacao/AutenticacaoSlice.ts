import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { servicoAutenticacao } from 'src/servicos/autenticacao';
import { servicoUnidades } from 'src/servicos/unidades';
import type { UnidadeResumo, UsuarioSessao } from 'src/types/acesso';
import { sessao } from 'src/utils/axios';
import { mensagemDeErro } from 'src/utils/erroApi';

/**
 * Usuário logado, árvore de unidades que ele alcança e a unidade que está
 * consultando no momento (null = a própria). Consultar outra unidade é só leitura.
 */
interface EstadoAutenticacao {
  usuario: UsuarioSessao | null;
  iniciado: boolean;
  unidades: UnidadeResumo[];
  unidadeVisualizadaId: number | null;
}

const estadoInicial: EstadoAutenticacao = {
  usuario: null,
  iniciado: false,
  unidades: [],
  unidadeVisualizadaId: null,
};

/** Na abertura do sistema: se há sessão guardada, recarrega o usuário. */
export const iniciarSessao = createAsyncThunk('autenticacao/iniciar', async () => {
  if (!sessao.existe()) return null;
  try {
    return await servicoAutenticacao.eu();
  } catch {
    sessao.limpar();
    return null;
  }
});

export const entrar = createAsyncThunk(
  'autenticacao/entrar',
  async ({ login, senha }: { login: string; senha: string }, { rejectWithValue }) => {
    try {
      const resposta = await servicoAutenticacao.entrar(login, senha);
      sessao.definir(resposta);
      return resposta.usuario;
    } catch (erro) {
      return rejectWithValue(mensagemDeErro(erro));
    }
  },
);

export const sair = createAsyncThunk('autenticacao/sair', async () => {
  const token = sessao.tokenRenovacao();
  sessao.limpar();
  if (token) await servicoAutenticacao.sair(token).catch(() => undefined);
});

export const carregarUnidades = createAsyncThunk('autenticacao/unidades', () => servicoUnidades.arvore());

const autenticacaoSlice = createSlice({
  name: 'autenticacao',
  initialState: estadoInicial,
  reducers: {
    usuarioAtualizado: (state, action: PayloadAction<UsuarioSessao>) => {
      state.usuario = action.payload;
    },
    sessaoEncerrada: () => ({ ...estadoInicial, iniciado: true }),
    visualizarUnidade: (state, action: PayloadAction<number | null>) => {
      const propria = state.usuario?.unidade.id;
      state.unidadeVisualizadaId = action.payload === propria ? null : action.payload;
      sessao.visualizarUnidade(state.unidadeVisualizadaId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(iniciarSessao.fulfilled, (state, action) => {
        state.usuario = action.payload;
        state.iniciado = true;
      })
      .addCase(entrar.fulfilled, (state, action) => {
        state.usuario = action.payload;
        state.unidadeVisualizadaId = null;
        sessao.visualizarUnidade(null);
      })
      .addCase(sair.fulfilled, () => ({ ...estadoInicial, iniciado: true }))
      .addCase(carregarUnidades.fulfilled, (state, action) => {
        state.unidades = action.payload;
      });
  },
});

export const { usuarioAtualizado, sessaoEncerrada, visualizarUnidade } = autenticacaoSlice.actions;
export default autenticacaoSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Preferências visuais (mesma estrutura do template). Tema claro/escuro e menu
 * recolhido ficam salvos no navegador, como no sistema antigo.
 */
interface StateType {
  activeDir: 'ltr';
  activeMode: 'light' | 'dark';
  activeTheme: string;
  SidebarWidth: number;
  MiniSidebarWidth: number;
  TopbarHeight: number;
  isCollapse: boolean;
  isLayout: 'full' | 'boxed';
  isSidebarHover: boolean;
  isMobileSidebar: boolean;
  isCardShadow: boolean;
  borderRadius: number;
}

const CHAVE_PREFERENCIAS = 'central-secretaria:preferencias';

function lerPreferencias(): Partial<Pick<StateType, 'activeMode' | 'isCollapse'>> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? '{}');
  } catch {
    return {};
  }
}

function salvarPreferencias(state: StateType) {
  try {
    localStorage.setItem(
      CHAVE_PREFERENCIAS,
      JSON.stringify({ activeMode: state.activeMode, isCollapse: state.isCollapse }),
    );
  } catch {
    // Navegador bloqueando armazenamento: segue sem lembrar a preferência.
  }
}

const preferencias = lerPreferencias();

const initialState: StateType = {
  activeDir: 'ltr',
  activeMode: preferencias.activeMode ?? 'light',
  activeTheme: 'BLUE_THEME',
  SidebarWidth: 270,
  MiniSidebarWidth: 87,
  TopbarHeight: 70,
  isLayout: 'full',
  isCollapse: preferencias.isCollapse ?? false,
  isSidebarHover: false,
  isMobileSidebar: false,
  isCardShadow: true,
  borderRadius: 7,
};

export const CustomizerSlice = createSlice({
  name: 'customizer',
  initialState,
  reducers: {
    setDarkMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.activeMode = action.payload;
      salvarPreferencias(state);
    },
    toggleSidebar: (state) => {
      state.isCollapse = !state.isCollapse;
      salvarPreferencias(state);
    },
    hoverSidebar: (state, action: PayloadAction<boolean>) => {
      state.isSidebarHover = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebar = !state.isMobileSidebar;
    },
    closeMobileSidebar: (state) => {
      state.isMobileSidebar = false;
    },
  },
});

export const { setDarkMode, toggleSidebar, hoverSidebar, toggleMobileSidebar, closeMobileSidebar } =
  CustomizerSlice.actions;

export default CustomizerSlice.reducer;

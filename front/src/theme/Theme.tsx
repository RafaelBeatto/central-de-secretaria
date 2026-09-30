import _ from 'lodash';
import { createTheme, Shadows, ThemeOptions } from '@mui/material/styles';
import { useSelector } from 'src/store/Store';
import { useEffect } from 'react';
import { AppState } from '../store/Store';
import components from './Components';
import typography from './Typography';
import { shadows, darkshadows } from './Shadows';
import { DarkThemeColors } from './DarkThemeColors';
import { LightThemeColors } from './LightThemeColors';
import { baseDarkTheme, baselightTheme } from './DefaultColors';
import { ptBR } from '@mui/material/locale';

export const BuildTheme = (config: any = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const customizer = useSelector((state: AppState) => state.customizer);
  const defaultTheme = customizer.activeMode === 'dark' ? baseDarkTheme : baselightTheme;
  const defaultShadow = customizer.activeMode === 'dark' ? darkshadows : shadows;
  const themeSelect = customizer.activeMode === 'dark' ? darkthemeOptions : themeOptions;
  const baseMode: ThemeOptions = {
    palette: {
      mode: customizer.activeMode,
    },
    shape: {
      borderRadius: customizer.borderRadius,
    },
    shadows: defaultShadow as Shadows,
    typography: typography,
  };
  const opcoes: ThemeOptions = _.merge({}, baseMode, defaultTheme, themeSelect, {
    direction: config.direction,
  });
  const theme = createTheme(opcoes, ptBR);
  // Mescla (e não substitui) para manter os textos em português do locale ptBR.
  theme.components = _.merge({}, theme.components, components(theme));

  return theme;
};

const ThemeSettings = () => {
  const activDir = useSelector((state: AppState) => state.customizer.activeDir);
  const activeTheme = useSelector((state: AppState) => state.customizer.activeTheme);
  const theme = BuildTheme({
    direction: activDir,
    theme: activeTheme,
  });
  useEffect(() => {
    document.dir = activDir;
  }, [activDir]);

  return theme;
};

export { ThemeSettings };

export enum ThemeMode
{
    LIGHT = 'LIGHT',
    DARK = 'DARK'
}

export interface AppTheme {
  mode: ThemeMode;

  colors: {
    background: string;
    surface: string;
    border: string;

    primary: string;
    primaryHover: string;

    secondary: string;
    secondaryHover: string;

    success: string;
    error: string;

    text: {
      main: string;
      muted: string;
      label: string;
    };
  };

  appBackground: {
    color: string;
    leftImage?: string;
    rightImage?: string;
    imageOpacity?: number;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
  };

  shadows: {
    soft: string;
    medium: string;
  };

  textStyles: {
    title: { fontSize: string; fontWeight: number };
    label: { fontSize: string; fontWeight: number };
    body: { fontSize: string };
  };
}

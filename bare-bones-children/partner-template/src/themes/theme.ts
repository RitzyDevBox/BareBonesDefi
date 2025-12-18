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

  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  radius: {
    sm: number;
    md: number;
    lg: number;
  };

  shadows: {
    soft: string;
    medium: string;
  };

  textStyles: {
    title: { fontSize: number; fontWeight: number };
    label: { fontSize: number; fontWeight: number };
    body: { fontSize: number };
  };
}

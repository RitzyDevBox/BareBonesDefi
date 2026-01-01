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
    surfaceHover: string;
    
    border: string;
    borderHover: string;

    primary: string;
    primaryHover: string;

    secondary: string;
    secondaryHover: string;

    success: string;
    warn: string;
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
    fullImage?: string;
    rightImage?: string;
    imageOpacity?: number;

    honeycomb?: {
      enabled: boolean;           // Default on/off (user can override)
      hexSize?: number;          // Default: 40
      opacity?: number;          // Base opacity, default: 0.1
      animationSpeed?: number;   // Multiplier, default: 1
      backgroundColor?: string;  // Defaults to appBackground.color
      hue?: number;             // Color hue (0-360), default: 35 (golden)
      saturation?: number;      // 0-100, default: 70
      lightness?: number;       // 0-100, default: 60
    }
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

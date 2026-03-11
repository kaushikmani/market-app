export const Theme = {
    colors: {
        // Surfaces
        appBackground: '#06060b',
        cardBackground: '#0e0e16',
        cardBackgroundHover: '#14141e',
        cardElevated: '#121220',
        inputBackground: '#0a0a12',
        sidebarBackground: '#0a0a12',
        surfaceSubtle: 'rgba(255,255,255,0.02)',

        // Borders
        cardBorder: 'rgba(255,255,255,0.06)',
        cardBorderHover: 'rgba(255,255,255,0.10)',
        borderActive: 'rgba(108, 138, 255, 0.3)',
        borderSubtle: 'rgba(255,255,255,0.03)',

        // Text
        primaryText: '#f0f0f5',
        secondaryText: '#6e6e88',
        tertiaryText: '#404058',
        mutedText: '#2e2e42',

        // Signals
        bullishGreen: '#00d68f',
        bullishGreenBg: 'rgba(0, 214, 143, 0.10)',
        bullishGreenBorder: 'rgba(0, 214, 143, 0.18)',
        bearishRed: '#ff5c5c',
        bearishRedBg: 'rgba(255, 92, 92, 0.10)',
        bearishRedBorder: 'rgba(255, 92, 92, 0.18)',
        neutralGray: '#6e6e88',

        // Accents
        accentBlue: '#6c8aff',
        accentBlueDim: 'rgba(108, 138, 255, 0.10)',
        accentBlueBorder: 'rgba(108, 138, 255, 0.20)',
        accentPurple: '#a78bfa',
        accentPurpleDim: 'rgba(167, 139, 250, 0.10)',
        accentAmber: '#f5a623',
        accentAmberDim: 'rgba(245, 166, 35, 0.10)',
        cyan: '#22d3ee',

        // Tabs
        tabSelected: '#f0f0f5',
        tabUnselected: '#404058',
    },

    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.5)',
        lg: '0 8px 32px rgba(0,0,0,0.6)',
        glowBlue: '0 0 24px rgba(108, 138, 255, 0.08)',
        glowGreen: '0 0 20px rgba(0, 214, 143, 0.08)',
    },

    radius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        full: '999px',
    },

    getSignalColor: (signal) => {
        switch (signal) {
            case 'bullish': return Theme.colors.bullishGreen;
            case 'bearish': return Theme.colors.bearishRed;
            default: return Theme.colors.neutralGray;
        }
    }
};

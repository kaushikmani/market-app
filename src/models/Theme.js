// Tape design system — warm near-black + signal-amber.
// Hex equivalents of the Tape OKLCH palette so JS color parsers
// (lightweight-charts, etc.) can read these values.

const ACC      = '#9fb0ff';
const ACC_DIM  = 'rgba(159, 176, 255, 0.12)';
const ACC_LINE = 'rgba(159, 176, 255, 0.30)';

const UP       = '#56d57b';
const UP_DIM   = 'rgba(86, 213, 123, 0.12)';
const UP_LINE  = 'rgba(86, 213, 123, 0.28)';

const DOWN     = '#fc5855';
const DOWN_DIM = 'rgba(252, 88, 85, 0.12)';
const DOWN_LINE= 'rgba(252, 88, 85, 0.28)';

export const Theme = {
    colors: {
        // Surfaces
        appBackground:       '#0a0908',
        cardBackground:      '#161312',
        cardBackgroundHover: '#1d1a18',
        cardElevated:        '#181614',
        inputBackground:     '#070505',
        sidebarBackground:   '#080706',
        surfaceSubtle:       'rgba(255, 255, 255, 0.02)',

        // Borders
        cardBorder:        '#2b2826',
        cardBorderHover:   '#403c39',
        borderActive:      ACC_LINE,
        borderSubtle:      '#1c1a18',

        // Text
        primaryText:   '#f3f1ee',
        secondaryText: '#a7a4a1',
        tertiaryText:  '#6b6865',
        mutedText:     '#45423f',

        // Signals
        bullishGreen:       UP,
        bullishGreenBg:     UP_DIM,
        bullishGreenBorder: UP_LINE,
        bearishRed:         DOWN,
        bearishRedBg:       DOWN_DIM,
        bearishRedBorder:   DOWN_LINE,
        neutralGray:        '#a7a4a1',

        // Accents — every primary action is amber
        accentBlue:        ACC,
        accentBlueDim:     ACC_DIM,
        accentBlueBorder:  ACC_LINE,
        accentPurple:      ACC,
        accentPurpleDim:   ACC_DIM,
        accentAmber:       ACC,
        accentAmberDim:    ACC_DIM,
        cyan:              '#5ec5d9',

        // Tabs
        tabSelected:   '#f3f1ee',
        tabUnselected: '#6b6865',
    },

    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.5)',
        lg: '0 8px 32px rgba(0,0,0,0.6)',
        glowBlue:  '0 0 24px rgba(159, 176, 255, 0.12)',
        glowGreen: '0 0 20px rgba(86, 213, 123, 0.10)',
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

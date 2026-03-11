// Signal Enums
export const SignalType = {
  BULLISH: 'bullish',
  BEARISH: 'bearish',
  NEUTRAL: 'neutral'
};

export const Signal = {
  getDisplayText: (signal) => {
    switch (signal) {
      case SignalType.BULLISH: return "Above";
      case SignalType.BEARISH: return "Below";
      default: return "Neutral";
    }
  },
  getArrowIcon: (signal) => {
    switch (signal) {
      case SignalType.BULLISH: return "▲";
      case SignalType.BEARISH: return "▼";
      default: return "●";
    }
  }
};

// Price Data
export class PriceData {
  constructor(open, high, low, close) {
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
  }

  get isPositiveDay() {
    return this.close > this.open;
  }

  get changePercent() {
    return ((this.close - this.open) / this.open) * 100;
  }
}

// Technical Indicators
export class RSIIndicator {
  constructor(value, period) {
    this.value = value;
    this.period = period;
  }

  get status() {
    if (this.value >= 70) return "Overbought";
    if (this.value <= 30) return "Oversold";
    return "Neutral";
  }

  get signal() {
    if (this.value >= 70) return SignalType.BEARISH;
    if (this.value <= 30) return SignalType.BULLISH;
    return SignalType.NEUTRAL;
  }
}

export class BollingerBandIndicator {
  constructor(value) {
    this.value = value; // %B (0-100 typically)
  }

  get status() {
    if (this.value >= 80) return "Near Upper";
    if (this.value <= 20) return "Near Lower";
    return "Middle";
  }

  get signal() {
    if (this.value >= 80) return SignalType.BEARISH;
    if (this.value <= 20) return SignalType.BULLISH;
    return SignalType.NEUTRAL;
  }
}

export class MACDIndicator {
  constructor(value, signalLine, histogram) {
    this.value = value;
    this.signalLine = signalLine;
    this.histogram = histogram;
  }

  get isBullish() {
    return this.histogram > 0;
  }

  get signal() {
    return this.isBullish ? SignalType.BULLISH : SignalType.BEARISH;
  }

  get status() {
    return this.isBullish ? "Bullish" : "Bearish";
  }
}

export class TechnicalIndicators {
  constructor(rsi, bollingerBandPercent, macd) {
    this.rsi = rsi;
    this.bollingerBandPercent = bollingerBandPercent;
    this.macd = macd;
  }

  get overallSignal() {
    const signals = [this.rsi.signal, this.bollingerBandPercent.signal, this.macd.signal];
    const bearishCount = signals.filter(s => s === SignalType.BEARISH).length;
    return bearishCount >= 2 ? SignalType.BEARISH : SignalType.BULLISH;
  }
}

// Metrics
export class VolatilityMetrics {
  constructor(averageDailyRange, atrFromFifty, percentFromFiftySMA) {
    this.averageDailyRange = averageDailyRange;
    this.atrFromFifty = atrFromFifty;
    this.percentFromFiftySMA = percentFromFiftySMA;
  }
}

// Moving Average
export const MAType = {
  SMA: 'SMA'
};

export class MovingAverage {
  constructor(type, period, value, percentFromPrice) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.period = period;
    this.value = value;
    this.percentFromPrice = percentFromPrice;
  }

  get signal() {
    return this.percentFromPrice > 0 ? SignalType.BULLISH : SignalType.BEARISH;
  }

  get displayName() {
    return `${this.type} ${this.period}`;
  }
}

// Stock
export class Stock {
  constructor(symbol, name, priceData, indicators, volatilityMetrics, movingAverages) {
    this.id = crypto.randomUUID();
    this.symbol = symbol;
    this.name = name;
    this.priceData = priceData;
    this.indicators = indicators;
    this.volatilityMetrics = volatilityMetrics;
    this.movingAverages = movingAverages;
  }
}

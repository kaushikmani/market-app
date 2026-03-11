import {
    Stock,
    PriceData,
    TechnicalIndicators,
    RSIIndicator,
    BollingerBandIndicator,
    MACDIndicator,
    VolatilityMetrics,
    MovingAverage,
    MAType
} from '../models/Stock';

export const MockDataService = {
    getSampleStock: () => {
        return new Stock(
            "SNDK",
            "SanDisk Corporation",
            new PriceData(412.17, 457.37, 412.17, 453.12),
            new TechnicalIndicators(
                new RSIIndicator(83, 14),
                new BollingerBandIndicator(95),
                new MACDIndicator(12.5, 10.2, 2.3)
            ),
            new VolatilityMetrics(6.64, 6.58, 71.98),
            [
                new MovingAverage(MAType.SMA, 8, 392.15, 15.6),
                new MovingAverage(MAType.SMA, 10, 385.80, 17.4),
                new MovingAverage(MAType.SMA, 21, 345.22, 31.3),
                new MovingAverage(MAType.SMA, 50, 263.48, 72.0),
                new MovingAverage(MAType.SMA, 100, 192.01, 136.0),
                new MovingAverage(MAType.SMA, 200, 116.19, 290.0),
            ]
        );
    }
};

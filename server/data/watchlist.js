// Single source of truth for watchlist groups.
// The frontend (src/data/watchlist.js) mirrors this file.
// To add/remove tickers, edit here and update the frontend copy.
export const WATCHLIST = [
  {
    name: 'ETFs & Indices',
    tickers: ['SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'SLV', 'XLK', 'XLC', 'XLV', 'IGV', 'ARKG', 'NAIL', 'EWY', 'EWZ', 'ILF', 'SOXL', 'MSOS'],
  },
  {
    name: 'Mega Cap Tech',
    tickers: ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'],
  },
  {
    name: 'Cybersecurity',
    tickers: ['CRWD', 'PANW', 'FTNT', 'ZS', 'OKTA', 'S', 'RBRK'],
  },
  {
    name: 'Storage & Memory',
    tickers: ['MU', 'WDC', 'STX', 'SNDK', 'PSTG'],
  },
  {
    name: 'Chip Design & Processors',
    tickers: ['AMD', 'INTC', 'ARM', 'AVGO', 'MRVL', 'TXN', 'ADI', 'ON', 'TSM', 'TSEM', 'GFS'],
  },
  {
    name: 'Semiconductor Equipment',
    tickers: ['ASML', 'LRCX', 'KLAC', 'AMAT', 'AMKR', 'ICHR', 'FORM', 'CAMT', 'TER'],
  },
  {
    name: 'AI & Custom Silicon',
    tickers: ['ALAB', 'CRDO', 'INDI', 'SOLS'],
  },
  {
    name: 'Optical/Photonics',
    tickers: ['ANET', 'CIEN', 'LITE', 'APH', 'FN', 'POET', 'SKYT', 'AXTI', 'COHR', 'AAOI', 'GLW', 'CLS', 'VIAV'],
  },
  {
    name: 'AI Infrastructure & Hardware',
    tickers: ['SMCI', 'VRT', 'DELL', 'HPE', 'SANM', 'FLEX', 'WYFI', 'AEHR', 'PLAB'],
  },
  {
    name: 'Software & Cloud',
    tickers: ['PLTR', 'ORCL', 'CRM', 'NOW', 'ADBE', 'TEAM', 'WDAY', 'HUBS', 'MDB', 'MNDY', 'SNOW', 'DDOG', 'NET', 'PATH', 'ZM', 'VEEV', 'ASAN', 'APPN', 'CFLT', 'DOCN', 'DOCU', 'ESTC', 'GTLB', 'TWLO'],
  },
  {
    name: 'Crypto & Blockchain',
    tickers: ['MSTR', 'COIN', 'HOOD', 'GLXY', 'NBIS', 'CRWV', 'CRCL', 'MARA', 'RIOT', 'HUT', 'IREN', 'WULF', 'CIFR', 'APLD', 'BMNR', 'IBIT', 'ETHA'],
  },
  {
    name: 'Nuclear & Utilities',
    tickers: ['VST', 'CEG', 'LEU', 'CCJ', 'UUUU', 'URNM', 'UEC', 'NXE', 'OKLO', 'SMR', 'TLN', 'BWXT', 'NNE', 'GEV', 'AVA'],
  },
  {
    name: 'Solar & Clean Energy',
    tickers: ['FSLR', 'ENPH', 'BE', 'PLUG', 'EOSE', 'SLDP', 'FLNC', 'CSIQ', 'DQ', 'JKS', 'NXT', 'RUN', 'SEDG'],
  },
  {
    name: 'Defense & Aerospace',
    tickers: ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'DRS', 'KD', 'KTOS', 'MRCY', 'BA', 'AVAV', 'RCAT', 'ONDS', 'UMAC', 'ERJ', 'AXON', 'KRMN'],
  },
  {
    name: 'Space',
    tickers: ['RKLB', 'ASTS', 'PL', 'BKSY', 'LUNR', 'RDW', 'SPCE'],
  },
  {
    name: 'Robotics & Automation',
    tickers: ['SERV', 'RR', 'SYM', 'ZBRA', 'ARBE', 'IRBT', 'KITT', 'MBOT', 'OUST', 'PDYN'],
  },
  {
    name: 'Quantum Computing',
    tickers: ['IONQ', 'RGTI', 'QBTS', 'QUBT', 'ASPI', 'BTQ', 'LAES'],
  },
  {
    name: 'Fintech & Insurance',
    tickers: ['FI', 'FISV', 'SOFI', 'ALLY', 'DFS', 'LMND', 'OSCR', 'ROOT', 'SEZL', 'DAVE', 'UPST'],
  },
  {
    name: 'Banks & Payments',
    tickers: ['V', 'MA', 'AXP', 'GS', 'JPM', 'BAC', 'C', 'SCHW', 'TD', 'USB', 'WFC', 'MTB'],
  },
  {
    name: 'China',
    tickers: ['BABA', 'BIDU', 'JD', 'PDD', 'FUTU', 'TCEHY', 'TIGR', 'WB', 'HUYA'],
  },
  {
    name: 'EVs & Charging',
    tickers: ['EV', 'LI', 'XPEV', 'RIVN', 'LCID', 'PONY', 'BLNK', 'CHPT', 'EVGO'],
  },
  {
    name: 'Air Mobility & Lidar',
    tickers: ['AIR', 'ACHR', 'JOBY', 'EVTL', 'LIDR', 'MVIS'],
  },
  {
    name: 'Healthcare & Biotech',
    tickers: ['UNH', 'ABBV', 'JNJ', 'MRK', 'LLY', 'NVO', 'AMGN', 'MRNA', 'CRSP', 'EXAS', 'GH', 'HALO', 'MDGL', 'NVAX', 'RVMD', 'SRPT', 'TWST', 'IMNM', 'ABCL', 'GRAL', 'NTLA', 'TEM', 'PRME', 'EDIT', 'GTBIF'],
  },
  {
    name: 'Housing & Real Estate',
    tickers: ['DHI', 'LEN', 'PHM', 'TOL', 'RKT', 'HIPO', 'REAL', 'CBRE', 'DLR', 'EQIX', 'JLL', 'O', 'OPEN', 'PLD', 'SPG', 'PRCH'],
  },
  {
    name: 'Social & Media',
    tickers: ['Z', 'RDDT', 'SNAP', 'PINS', 'ZETA', 'SPOT', 'TTD', 'APP', 'DIS', 'NFLX', 'RBLX', 'U'],
  },
  {
    name: 'Consumer & Retail',
    tickers: ['HD', 'WMT', 'NKE', 'KO', 'PG', 'MMM', 'TRV', 'VZ', 'WBA', 'FOOD', 'CAVA', 'W', 'JMIA'],
  },
  {
    name: 'Restaurants',
    tickers: ['CBRL', 'CMG', 'COCO', 'DNUT', 'EAT', 'JACK', 'PFGC', 'SG', 'SHAK', 'WING'],
  },
  {
    name: 'Travel & Leisure',
    tickers: ['ABNB', 'BKNG', 'EXPE', 'CCL', 'RCL', 'NCLH', 'AAL', 'DAL', 'JBLU', 'ALK', 'SAVE', 'TCOM'],
  },
  {
    name: 'Oil & Gas',
    tickers: ['OIL', 'XOM', 'BP', 'SHEL', 'CVX', 'AR', 'DVN', 'OXY', 'GAS'],
  },
  {
    name: 'Materials & Industrial',
    tickers: ['TE', 'DOW', 'CAT', 'HON', 'SCCO', 'FCX', 'ALB', 'LAC', 'SGML', 'SQM', 'MP', 'TMC', 'AMSC'],
  },
  {
    name: 'Battery & EV Materials',
    tickers: ['ABAT', 'AMPX', 'ENVX', 'MVST', 'NVX', 'QS'],
  },
  {
    name: 'Legacy Tech',
    tickers: ['IBM', 'CSCO'],
  },
  {
    name: 'Meme & Speculative',
    tickers: ['MEME', 'AMC', 'GME', 'PTON'],
  },
];

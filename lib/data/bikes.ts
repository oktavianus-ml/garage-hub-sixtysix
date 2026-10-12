export const OTHER_BIKE = "Lainnya";
export const OLDEST_BIKE_YEAR = 1990;

export type BikeModel = {
  brand: string;
  type: string;
  from: number;
  to?: number;
};

export const bikeCatalog: BikeModel[] = [
  { brand: "Honda", type: "BeAT", from: 2008 },
  { brand: "Honda", type: "BeAT Street", from: 2020 },
  { brand: "Honda", type: "Vario 125", from: 2012 },
  { brand: "Honda", type: "Vario 150", from: 2015, to: 2021 },
  { brand: "Honda", type: "Vario 160", from: 2022 },
  { brand: "Honda", type: "Scoopy", from: 2010 },
  { brand: "Honda", type: "Genio", from: 2019 },
  { brand: "Honda", type: "Stylo 160", from: 2024 },
  { brand: "Honda", type: "PCX 150", from: 2018, to: 2021 },
  { brand: "Honda", type: "PCX 160", from: 2021 },
  { brand: "Honda", type: "ADV 150", from: 2019, to: 2021 },
  { brand: "Honda", type: "ADV 160", from: 2022 },
  { brand: "Honda", type: "Supra X 125", from: 2005 },
  { brand: "Honda", type: "Revo", from: 2007 },
  { brand: "Honda", type: "Sonic 150R", from: 2015 },
  { brand: "Honda", type: "CB150R", from: 2012 },
  { brand: "Honda", type: "CB150X", from: 2021 },
  { brand: "Honda", type: "CBR150R", from: 2011 },
  { brand: "Honda", type: "CBR250RR", from: 2016 },
  { brand: "Honda", type: "CRF150L", from: 2017 },
  { brand: "Honda", type: "Verza", from: 2013, to: 2018 },
  { brand: "Honda", type: "Mega Pro", from: 2006, to: 2015 },
  { brand: "Honda", type: "Tiger", from: 2006, to: 2014 },
  { brand: "Yamaha", type: "NMAX", from: 2015 },
  { brand: "Yamaha", type: "Aerox", from: 2016 },
  { brand: "Yamaha", type: "Lexi", from: 2018 },
  { brand: "Yamaha", type: "Fazzio", from: 2022 },
  { brand: "Yamaha", type: "Gear 125", from: 2017 },
  { brand: "Yamaha", type: "Grand Filano", from: 2021 },
  { brand: "Yamaha", type: "Mio", from: 2007 },
  { brand: "Yamaha", type: "XMAX", from: 2017 },
  { brand: "Yamaha", type: "MX King", from: 2015 },
  { brand: "Yamaha", type: "Vixion", from: 2007 },
  { brand: "Yamaha", type: "Jupiter Z", from: 2006, to: 2015 },
  { brand: "Yamaha", type: "R15", from: 2014 },
  { brand: "Yamaha", type: "XSR 155", from: 2019 },
  { brand: "Yamaha", type: "WR155", from: 2020 },
  { brand: "Suzuki", type: "Address", from: 2014 },
  { brand: "Suzuki", type: "Nex", from: 2013 },
  { brand: "Suzuki", type: "Satria F150", from: 2016 },
  { brand: "Suzuki", type: "GSX-R150", from: 2017 },
  { brand: "Suzuki", type: "GSX-S150", from: 2017 },
  { brand: "Suzuki", type: "Smash", from: 2006, to: 2018 },
  { brand: "Suzuki", type: "Burgman Street", from: 2020 },
  { brand: "Kawasaki", type: "W175", from: 2017 },
  { brand: "Kawasaki", type: "KLX 150", from: 2014 },
  { brand: "Kawasaki", type: "Ninja 250", from: 2013 },
  { brand: "Kawasaki", type: "Ninja ZX-25R", from: 2020 },
  { brand: "Vespa", type: "Sprint", from: 2014 },
  { brand: "Vespa", type: "Primavera", from: 2014 },
  { brand: "Vespa", type: "LX", from: 2005, to: 2019 },
  { brand: "Vespa", type: "GTS", from: 2016 },
];

export function bikeBrands() {
  return [...new Set(bikeCatalog.map((bike) => bike.brand))];
}

export function bikeTypes(brand: string) {
  return bikeCatalog.filter((bike) => bike.brand === brand).map((bike) => bike.type);
}

export function findBike(brand: string, type: string) {
  return bikeCatalog.find((bike) => bike.brand === brand && bike.type === type);
}

export function yearOptions(from: number, to: number) {
  const years: number[] = [];
  for (let year = to; year >= from; year -= 1) years.push(year);
  return years;
}

export function yearsForBike(brand: string, type: string, now = new Date().getFullYear()) {
  const model = findBike(brand, type);
  if (!model) return yearOptions(OLDEST_BIKE_YEAR, now);
  const end = Math.min(model.to ?? now, now);
  return yearOptions(model.from, end);
}

export function bikeSelectionError(brand: string, type: string, year: number, now = new Date().getFullYear()) {
  if (!brand || !type || brand === OTHER_BIKE || type === OTHER_BIKE) {
    return "Lengkapi plat, merk, tipe, dan tahun.";
  }
  const model = findBike(brand, type);
  if (model) {
    const end = Math.min(model.to ?? now, now);
    if (year < model.from || year > end) return "Tahun tidak sesuai tipe motor.";
    return null;
  }
  if (year < OLDEST_BIKE_YEAR || year > now) return "Tahun di luar jangkauan.";
  return null;
}

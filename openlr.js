const roundRaw = require('./round');
const res = Math.pow(2, 24)
const sgn = int => {
  if (int === 0) {
    return int;
  }
  if (int > 0) {
    return 1;
  }
  if (int < 0) {
    return -1;
  }
}
const round = n =>roundRaw(n, -5);
const absolute = int => round(((int - sgn(int) * 0.5) * 360) / res);

const decodeAbsolute = b=>{
  const lon = b.readIntBE(1, 3);
  const lat = b.readIntBE(4, 3);
  return [absolute(lon), absolute(lat)];
}
const decodeReletive = (b, offset, prev) =>{
  const rawDlon = b.readIntBE(offset, 2);
  const dlon = rawDlon / 100000;
  const rawDlat = b.readIntBE(offset + 2, 2);
  const dlat = rawDlat / 100000;
  return [round(prev[0] + dlon), round(prev[1] + dlat)];
}
const decodeReletiveLine = (b, num, prev) => {
  let offset = (num * 7) + 3;
  return decodeReletive(b, offset, prev);
}

const getPtCountLine = size => {
  let s2 = size - 16;
  let offset = s2 % 7;
  if (offset > 2) {
    throw new Error(`invalid length for line "${size}"`);
  }
  let s3 = s2 - offset;
  return (s3/7) + 2;
}
const FOW = ['UNDEFINED', 'MOTORWAY', 'MULTIPLE_CARRIAGEWAY', 'SINGLE_CARRIAGEWAY', 'ROUNDABOUT', 'TRAFFICSQUARE', 'SLIPROAD', 'OTHER'];
const FRC = ['FRC 0 – Main road, highest importance', 'FRC 1 – First class road', 'FRC 2 – Second class road', 'FRC 3 – Third class road', 'FRC 4 – Fourth class road', 'FRC 5 – Fifth class road', 'FRC 6 – Sixth class road', 'FRC 7 – Other class road, lowest importance'];
const atr1 = (buf, offset) => {
  let a = buf[offset];
  let fow = a & 7;
  let frc = (a & 56) >> 3;
  return {
    frc: FRC[frc],
    fow: FOW[fow]
  }
}
const atr2 = (buf, offset) => {
  let a = buf[offset + 1];
  let bear = a & 31;
  let lfrcnp = (a & 224) >> 5;
  return {
    lfrcnp: FRC[lfrcnp],
    bear: (bear * 11.25)
  };
}
const atr3 = (buf, offset) => {
  let a = buf[offset + 2];
  return a * 58.6;
}
const atr4 = (buf, offset) => {
  let a = buf[offset + 1];
  let bear = a & 31;
  let nOff = a & 32;
  let pOff = a & 64;
  return {
    bear: (bear * 11.25),
    nOff: !!nOff,
    pOff: !!pOff
  }
}
const atr5 = (buf, offset) => {
  let a = buf[offset];
  let fow = a & 7;
  let frc = (a & 56) >> 3;
  let orientation = (a & 192) >> 6;
  return {
    frc: FRC[frc],
    fow: FOW[fow],
    orientation
  }
}
const atr6 = (buf, offset) => {
  let a = buf[offset];
  let fow = a & 7;
  let frc = (a & 56) >> 3;
  let sor = (a & 192) >> 6;
  return {
    frc: FRC[frc],
    fow: FOW[fow],
    sor
  }
}
const atr7 = (buf, offset) => {
  let a = buf[offset + 1];
  return a & 31;
}
const pointAlongAttr1 = buf => {
  let {bear, lfrcnp} = atr2(buf, 7);
  let dnp = atr3(buf, 7);
  let {frc, fow, orientation} = atr5(buf, 7);
  return {
    frc, fow, bear, lfrcnp, dnp, orientation
  };
}
const pointAlongAttr2 = buf => {
  let {bear, nOff, pOff} = atr4(buf, 14);
  let {sor, frc, fow} = atr6(buf, 14);
  return {
    bear, nOff, pOff, sor, frc, fow
  };
}
const isLastLine = (size, num) =>{
  const length = getPtCountLine(size);
  return (num + 1) === length;
}

const getAtributesLine = (buf, num) => {
  let offset = (num * 7) + 7;
  if (isLastLine(buf.length, num)) {
    let {frc, fow} = atr1(buf, offset);
    let {bear, nOff, pOff} = atr4(buf, offset);
    return {frc, fow, bear, nOff, pOff};
  }
  let {frc, fow} = atr1(buf, offset);
  let {bear, lfrcnp} = atr2(buf, offset);
  let dnp = atr3(buf, offset);
  return {
    frc, fow, bear, lfrcnp, dnp
  };
}
const getHeader = b => {
  const header = b[0];
  let hasAtr = header & 8;
  let af = header & 80;
  let point = header & 32;
  let area;
  switch (af) {
    // circle or no area
    case 0:
      area = 0;
      break;
    // polygon
    case 16:
      area = 1;
      break;
    // rectangle or grid
    case 64:
      area = 2;
      break;
    // closed line
    case 80:
      area = 3;
      break;
  }
  return {
    atr: !!hasAtr,
    point: !!point,
    area: area
  };
}
const types = [
  'Line',
  'Geo-coordinate',
  'Point along line',
  'POI with access point',
  'Circle',
  'Rectangle',
  'Grid',
  'Polygon',
  'ClosedLine'
];
const getType = b => {
  let header = getHeader(b);
  if (header.point) {
    if (header.atr) {
      if (b.length < 20) {
        // point along line
        return 2;
      } else {
        // poi
        3;
      }
    } else {
      // coordinate
      return 1;
    }
  }
  switch (header.area) {
    case 0:
      if (header.atr) {
        // line
        return 0;
      } else {
        // Circle
        return 4;
      }
    case 1:
      //polygon
      return 7;
    case 2:
      if (b.length < 15) {
        // Rectangle
        return 5;
      } else {
        // Grid
        return 6
      }
    case 3:
      //ClosedLine
      return 8;
  }
}
const hanldeLineOffsets = (b, attr) => {
  let pOffset = 0;
  let nOffset = 0;
  let lastAtr = attr[attr.length - 1];
  if (lastAtr.pOff) {
    let posByte = lastAtr.nOff ? b.readInt8(b.length - 2) : b.readInt8(b.length - 1);
    pOffset = (posByte/256) * 100;
  }
  if (lastAtr.nOff) {
    let negByte = b.readInt8(b.length - 1);
    nOffset = (negByte/256) * 100;
  }
  return {
    pOffset, nOffset
  };
};
exports.types = types;
const updateBbox = (bbox, point) => {
  if (point[0] < bbox[0]) {
    bbox[0] = point[0];
  } else  if (point[0] > bbox[2]) {
    bbox[2] = point[0];
  }
  if (point[1] < bbox[1]) {
    bbox[1] = point[1];
  } else  if (point[1] > bbox[3]) {
    bbox[3] = point[1];
  }
};
const decodeLine = b=>{
  const num = getPtCountLine(b.length);
  let prev = decodeAbsolute(b);
  let bbox = [prev[0], prev[1], prev[0], prev[1]];
  let all = [prev];
  let attr = [getAtributesLine(b, 0)];
  var i = 0;
  while (++i < num) {
    prev = decodeReletiveLine(b, i, prev);
    updateBbox(bbox, prev);
    all.push(prev);
    attr.push(getAtributesLine(b, i));
  }
  let {pOffset, nOffset} = hanldeLineOffsets(b, attr)
  return {
    points: all,
    attributes: attr,
    pOffset, nOffset, bbox
  };
}
const decodeRadius = b => {
  const size = b.length - 7;
  return b.readUintLE(7, size);
}
const decodeCircle = b => {
  const center = decodeAbsolute(b);
  const radius = decodeRadius(b);
  return {center, radius};
};
const decodePointAlong = b => {
  const p1 = decodeAbsolute(b);
  const points = [
    p1,decodeReletiveLine(b, 1, p1)
  ]
  const attributes = [
    pointAlongAttr1(b),
    pointAlongAttr2(b)
  ];
  let offset = 0;
  if (b.length === 16) {
    return {
      points,
      attributes,
      offset
    }
  }
  if (attributes[1].pOff) {
    let posByte = b[16];
    let dist = attributes[0].dnp;
    offset = (posByte/256) * dist;
  }
  return {
    points,
    attributes,
    offset
  }
}
const decodePoi = b => {
  const out = decodePointAlong(b);
  out.poi = decodeReletive(b, 17, out.points[0]);
  return out;
}
const decodeRectangle = b => {
  if (b.length === 11) {
    let lr = decodeAbsolute(b);
    let tr = decodeReletive(b, 7, lr);
    return {lr, tr};
  }
  let lr = decodeAbsolute(b);
  let tr = decodeAbsolute(b.slice(6));
  return {lr, tr};
}
const decodeGrid = b => {
  let lr = decodeAbsolute(b);
  let tr;
  let offset;
  if (b.length === 15) {
    tr = decodeReletive(b, 7, lr);
    offset = 11;
  } else {
    offset = 13;
    tr = decodeAbsolute(b.slice(6));
  }
  let col = b.readUintBE(offset, 2);
  let row = b.readUintBE(offset + 2, 2);
  return {lr, tr, col, row};
};
const getPolyLen = size => {
  let base = size - 15;
  if (base % 4) {
    throw new Error(`invalid polygon length "${size}"`);
  }
  return base/4;
}
const decodeReletivePoly = (b, num, prev) => {
  let offset = 7 + (num * 4);
  return decodeReletive(b, offset, prev);
}
const decodePolygon = b => {
  let prev = decodeAbsolute(b);
  const out = [prev];
  const len = getPolyLen(b.length);
  let i = 0;
  while (++i < len) {
    prev = decodeReletivePoly(b, i, prev);
    out.push(prev);
  }
  return out;
};
const getPtCountClosedLine = size => {
  let base = size - 5;
  if (base % 7) {
    throw new Error(`invalid close line length "${size}"`);
  }
  return base/7;
}
const getLastAtrClosed = b => {
  let offset = b.length - 3;
  const out = atr1(offset);
  out.bear = atr7(offset);
  return out;
}
const getAtributesClosedLine = (buf, num) => {
  let offset = (num * 7) + 7;
  let {frc, fow} = atr1(buf, offset);
  let {bear, lfrcnp} = atr2(buf, offset);
  let dnp = atr3(buf, offset);
  return {
    frc, fow, bear, lfrcnp, dnp
  };
}
const decodeClosedLine = b => {
  const num = getPtCountClosedLine(b.length);
  const first = decodeAbsolute(b);
  let prev = first;
  let all = [prev];
  let attr = [getAtributesClosedLine(b, 0)];
  var i = 0;
  while (++i < num) {
    prev = decodeReletiveLine(b, i, prev);
    all.push(prev);
    attr.push(getAtributesClosedLine(b, i));
  }
  all.push(first);
  attr.push(getLastAtrClosed(b));
  return {
    points: all,
    attributes: attr
  };
};

const decode = b => {
  if (typeof b === 'string') {
    b = Buffer.from(b, 'base64');
  }
  const type = getType(b);
  switch (type) {
    case 0:
      return decodeLine(b);
    case 1:
      return decodeAbsolute(b);
    case 2:
      return decodePointAlong(b);
    case 3:
      return decodePoi(b);
    case 4:
      return decodeCircle(b);
    case 5:
      return decodeRectangle(b);
    case 6:
      return decodeGrid(b);
    case 7:
      return decodePolygon(b);
    case 8:
      return decodeClosedLine(b);
    default:
      throw new Error(`support for ${types[type]} not added`);
  }
}
exports.decode = decode;

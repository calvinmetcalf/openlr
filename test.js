const assert = require('assert');
const openlr = require('./openlr');
const testData = [
  {
    data: 'CwRbWyNG9RpsCQCb/jsbtAT/6/+jK1lE',
    type: 'Line',
    output: {
      points:[
        [6.12682,49.60852],
        [6.12837,49.60399],
        [6.12816,49.60306]
      ],
      attributes: [
        {
          frc: 'FRC 3 – Third class road',
          fow: 'MULTIPLE_CARRIAGEWAY',
          bear: 135,
          lfrcnp: 'FRC 3 – Third class road',
          dnp: 527.4
        },
        {
          frc: 'FRC 3 – Third class road',
          fow: 'SINGLE_CARRIAGEWAY',
          bear: 225,
          lfrcnp: 'FRC 5 – Fifth class road',
          dnp: 234.4
        },
        {
          frc: 'FRC 5 – Fifth class road',
          fow: 'SINGLE_CARRIAGEWAY',
          bear: 281.25,
          nOff: false,
          pOff: true
        }
      ],
      nOffset: 0,
      pOffset: 26.5625,
      bbox: [
        6.12682, 49.60306,6.12837,49.60852
      ]
    }
  },
  {
    data: 'IwRbYyNGuw==',
    type: 'GeoCoordinate'
  },
  {
    data: 'KwRboCNGfhJRAf/O/7SSQ00=',
    type: 'PointAlongLine'
  },
  {
    data: 'KwRboCNGfhJRAf/O/7SSQ03/fgCD',
    type: 'PoiWithAccessPoint'
  },
  {
    data: 'QwRbICNGeQFAAH0=',
    type: 'Circle'
  },
  {
    data: 'QwRbICNGeQFAAH0=',
    type: 'Rectangle'
  },
  {
    data: 'QwRbICNGeQBKAB8ABQAD',
    type: 'Grid'
  },
  {
    data: 'EwRbHSNGdQFiAA//XADz/64AJP9b/7U=',
    type: 'Polygon'
  },
  {
    data: 'WwRboCNGfhJrBAAJ/zkb9AgTFQ==',
    type: 'ClosedLine'
  }
]
function testOne(i) {
  var data = testData[i];
  var actual = openlr.decode(data.data);
  var expeted = data.output;
  assert.deepStrictEqual(actual, expeted);
}
testOne(0);

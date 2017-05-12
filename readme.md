openlr
===

Parser for [openlr](http://www.openlr.info/) data.
```bash
npm install openlr
```

```js
const openlr = require('openlr');
openlr.decode(openlrData);
```

currently only tested on lines which return an object with a points array, an
attributes array, nOffset and nOffset (pertaining to the positive and negative offset), and a bbox.  See the [openlr](http://www.openlr.info/data/docs/OpenLR-Whitepaper_v1.5.pdf) white paper for more details about the attributes.

misc
---

The openlr white paper defines the offset to be a uInt, but the examples treat the offsets as an int, unclear which is the case.

While all the numbers are big endian, the white paper seems to imply circle radius should be little endian but the example doesn't make it clear which way it should be, this library treats it as a little endian number. 

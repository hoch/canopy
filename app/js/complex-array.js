// 
//
//

(function (exports) {
  'use strict';

  var _sqrt = Math.sqrt;
  var _abs = function (real, imag) {
    return Math.sqrt(real * real + imag * imag);
  };

  function ComplexArray (length) {
    // TODO: should check length is power of 2.
    this.real = new Float32Array(length);
    this.imag = new Float32Array(length);
    this.length = length;
  }

  ComplexArray.prototype.getConjugate = function () {
    // TODO: implement this.
  };

  // Replace real/imag data by the user-defined task.
  ComplexArray.prototype.replace = function (task) {
    // Use single object to avoid GC.
    var complexValue = {};
    for (var i = 0, N = this.length; i < N; i++) {
      complexValue.real = this.real[i];
      complexValue.imag = this.imag[i];
      task(complexValue, i, N);
      this.real[i] = complexValue.real;
      this.imag[i] = complexValue.imag;
    }
  };

  // Fetch and iterate data with the user defined task up to the upper limit.
  ComplexArray.prototype.iterate = function (task, upperLimit) {
    for (var i = 0, N = Math.min(this.length, upperLimit); i < N; i++) {
      task(this.real[i], this.imag[i], i, N);
    }
  };

  // Return magnitude up to the length of argument array.
  ComplexArray.prototype.getMagnitude = function (array) {
    for (var i = 0, N = array.length; i < N; i++) {
      array[i] = _abs(this.real[i], this.imag[i]);
    }
  };

  // Inject ComplexArray class.
  exports.ComplexArray = ComplexArray;

})(window);



// 'use strict';

// !function(exports, undefined) {

//   var
//     // If the typed array is unspecified, use this.
//     DefaultArrayType = Float32Array,
//     // Simple math functions we need.
//     sqrt = Math.sqrt,
//     sqr = function(number) {return Math.pow(number, 2)},
//     // Internal convenience copies of the exported functions
//     isComplexArray,
//     ComplexArray

//   exports.isComplexArray = isComplexArray = function(obj) {
//     return obj !== undefined &&
//       obj.hasOwnProperty !== undefined &&
//       obj.hasOwnProperty('real') &&
//       obj.hasOwnProperty('imag')
//   }

//   exports.ComplexArray = ComplexArray = function(other, opt_array_type){
//     if (isComplexArray(other)) {
//       // Copy constuctor.
//       this.ArrayType = other.ArrayType
//       this.real = new this.ArrayType(other.real)
//       this.imag = new this.ArrayType(other.imag)
//     } else {
//       this.ArrayType = opt_array_type || DefaultArrayType
//       // other can be either an array or a number.
//       this.real = new this.ArrayType(other)
//       this.imag = new this.ArrayType(this.real.length)
//     }

//     this.length = this.real.length
//   }

//   ComplexArray.prototype.toString = function() {
//     var components = []

//     this.forEach(function(c_value, i) {
//       components.push(
//         '(' +
//         c_value.real.toFixed(2) + ',' +
//         c_value.imag.toFixed(2) +
//         ')'
//       )
//     })

//     return '[' + components.join(',') + ']'
//   }

//   // In-place mapper.
//   ComplexArray.prototype.map = function(mapper) {
//     var
//       i,
//       n = this.length,
//       // For GC efficiency, pass a single c_value object to the mapper.
//       c_value = {}

//     for (i = 0; i < n; i++) {
//       c_value.real = this.real[i]
//       c_value.imag = this.imag[i]
//       mapper(c_value, i, n)
//       this.real[i] = c_value.real
//       this.imag[i] = c_value.imag
//     }

//     return this
//   }

//   ComplexArray.prototype.forEach = function(iterator) {
//     var
//       i,
//       n = this.length,
//       // For consistency with .map.
//       c_value = {}

//     for (i = 0; i < n; i++) {
//       c_value.real = this.real[i]
//       c_value.imag = this.imag[i]
//       iterator(c_value, i, n)
//     }
//   }

//   ComplexArray.prototype.conjugate = function() {
//     return (new ComplexArray(this)).map(function(value) {
//       value.imag *= -1
//     })
//   }

//   // Helper so we can make ArrayType objects returned have similar interfaces
//   //   to ComplexArrays.
//   function iterable(obj) {
//     if (!obj.forEach)
//       obj.forEach = function(iterator) {
//         var i, n = this.length

//         for (i = 0; i < n; i++)
//           iterator(this[i], i, n)
//       }

//     return obj
//   }

//   ComplexArray.prototype.magnitude = function() {
//     var mags = new this.ArrayType(this.length)

//     this.forEach(function(value, i) {
//       mags[i] = sqrt(sqr(value.real) + sqr(value.imag))
//     })

//     // ArrayType will not necessarily be iterable: make it so.
//     return iterable(mags)
//   }

// }(typeof exports === 'undefined' && (this.complex_array = {}) || exports)
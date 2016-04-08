"use strict";

var natives = {
    noop : function (symbols) {
        return symbols.x[0].value;
    },
    // type conversions
    ord : function (symbols) {
        return symbols.x[0].value.codePointAt(0);
    },
    chr : function (symbols, loc) {
        try {
            return String.fromCodePoint(symbols.x[0].value);
        } catch (e) {
            if (e instanceof RangeError) {
                throw new InterpreterError("Invalid character code " + symbols.x[0].value, loc);
            } else {
                throw e;
            }
        }
    },
    trunc : function (symbols) {
        return symbols.x[0].value | 0;
    },
    test_float : function (symbols) {
        return symbols.x[0].value ? true : false;
    },
    parseInt : function (symbols, loc) {
        var x = parseInt(symbols.x[0].value.join(''), 10);
        if ((x | 0) !== x) {
            throw new InterpreterError(symbols.x[0].value.join('') + " does not form a valid 32-bit integer", loc);
        }
        return x;
    },
    parseFloat : function (symbols, loc) {
        return parseFloat(symbols.x[0].value.join(''));
    },
    String : function (symbols) {
        return [...String(symbols.x[0].value)];
    },
    // Boolean constants
    true : function () {
        return true;
    },
    false : function () {
        return false;
    },
    null : function () {
        return null;
    },
    // Math operators
    plus : function (symbols) {
        return symbols.lhs[0].value + symbols.rhs[0].value;
    },
    plus_int : function (symbols) {
        return natives.plus(symbols) | 0;
    },
    minus : function (symbols) {
        return symbols.lhs[0].value - symbols.rhs[0].value;
    },
    minus_int : function (symbols) {
        return natives.minus(symbols) | 0;
    },
    times : function (symbols) {
        return symbols.lhs[0].value * symbols.rhs[0].value;
    },
    times_int : function (symbols) {
        return natives.times(symbols) | 0;
    },
    over : function (symbols) {
        return symbols.lhs[0].value / symbols.rhs[0].value;
    },
    mod : function (symbols) {
        return symbols.lhs[0].value % symbols.rhs[0].value;
    },
    isnan : function (symbols) {
        return isnan(symbols.x[0].value);
    },
    negate : function (symbols) {
        return -symbols.x[0].value;
    },
    negate_int : function (symbols) {
        return natives.negate(symbols) | 0;
    },

    // comparison
    greater : function (symbols) {
        return symbols.lhs[0].value > symbols.rhs[0].value;
    },
    less : function (symbols) {
        return symbols.lhs[0].value < symbols.rhs[0].value;
    },
    greater_equal : function (symbols) {
        return symbols.lhs[0].value >= symbols.rhs[0].value;
    },
    less_equal : function (symbols) {
        return symbols.lhs[0].value <= symbols.rhs[0].value;
    },
    equal : function (symbols) {
        return symbols.lhs[0].value == symbols.rhs[0].value;
    },
    not_equal : function (symbols) {
        return symbols.lhs[0].value != symbols.rhs[0].value;
    },

    // bitwise
    and : function (symbols) {
        return symbols.lhs[0].value & symbols.rhs[0].value;
    },
    or : function (symbols) {
        return symbols.lhs[0].value | symbols.rhs[0].value;
    },
    xor : function (symbols) {
        return symbols.lhs[0].value ^ symbols.rhs[0].value;
    },
    not : function (symbols) {
        return ~symbols.x[0].value;
    },
    shift_left : function (symbols) {
        return symbols.lhs[0].value << symbols.rhs[0].value;
    },
    shift_right : function (symbols) {
        return symbols.lhs[0].value >> symbols.rhs[0].value;
    },

    // array
    length : function (symbols) {
        return symbols.x[0].value.length;
    },
    join : function (symbols) {
        return symbols.x[0].value.concat(symbols.y[0].value);
    },
    subarray : function (symbols) {
        return symbols.x[0].value.slice(symbols.start[0].value, symbols.end[0].value);
    },
};


module.exports = natives;

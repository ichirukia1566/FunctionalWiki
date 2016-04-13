"use strict";

function get_param(name, symbols) {
    if (symbols[name] === undefined) {
        if (symbols['@next'] === undefined) {
            return undefined;
        } else {
            return get_param(name, symbols['@next']);
        }
    }
    return symbols[name][0];
}

var natives = {
    noop : function (symbols) {
        return get_param('x', symbols).value;
    },
    // type conversions
    ord : function (symbols) {
        return get_param('x', symbols).value.codePointAt(0);
    },
    chr : function (symbols, loc) {
        try {
            return String.fromCodePoint(get_param('x', symbols).value);
        } catch (e) {
            if (e instanceof RangeError) {
                throw new InterpreterError("Invalid character code " + get_param('x', symbols).value, loc);
            } else {
                throw e;
            }
        }
    },
    trunc : function (symbols) {
        return get_param('x', symbols).value | 0;
    },
    test_float : function (symbols) {
        return get_param('x', symbols).value ? true : false;
    },
    parseInt : function (symbols, loc) {
        var x = parseInt(get_param('x', symbols).value.join(''), 10);
        if ((x | 0) !== x) {
            throw new InterpreterError(get_param('x', symbols).value.join('') + " does not form a valid 32-bit integer", loc);
        }
        return x;
    },
    parseFloat : function (symbols, loc) {
        return parseFloat(get_param('x', symbols).value.join(''));
    },
    String : function (symbols) {
        return [...String(get_param('x', symbols).value)];
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
        return get_param('lhs', symbols).value + get_param('rhs', symbols).value;
    },
    plus_int : function (symbols) {
        return natives.plus(symbols) | 0;
    },
    minus : function (symbols) {
        return get_param('lhs', symbols).value - get_param('rhs', symbols).value;
    },
    minus_int : function (symbols) {
        return natives.minus(symbols) | 0;
    },
    times : function (symbols) {
        return get_param('lhs', symbols).value * get_param('rhs', symbols).value;
    },
    times_int : function (symbols) {
        return natives.times(symbols) | 0;
    },
    over : function (symbols) {
        return get_param('lhs', symbols).value / get_param('rhs', symbols).value;
    },
    mod : function (symbols) {
        return get_param('lhs', symbols).value % get_param('rhs', symbols).value;
    },
    isnan : function (symbols) {
        return isnan(get_param('x', symbols).value);
    },
    negate : function (symbols) {
        return -get_param('x', symbols).value;
    },
    negate_int : function (symbols) {
        return natives.negate(symbols) | 0;
    },

    // comparison
    greater : function (symbols) {
        return get_param('lhs', symbols).value > get_param('rhs', symbols).value;
    },
    less : function (symbols) {
        return get_param('lhs', symbols).value < get_param('rhs', symbols).value;
    },
    greater_equal : function (symbols) {
        return get_param('lhs', symbols).value >= get_param('rhs', symbols).value;
    },
    less_equal : function (symbols) {
        return get_param('lhs', symbols).value <= get_param('rhs', symbols).value;
    },
    equal : function (symbols) {
        return get_param('lhs', symbols).value == get_param('rhs', symbols).value;
    },
    not_equal : function (symbols) {
        return get_param('lhs', symbols).value != get_param('rhs', symbols).value;
    },

    // bitwise
    and : function (symbols) {
        return get_param('lhs', symbols).value & get_param('rhs', symbols).value;
    },
    or : function (symbols) {
        return get_param('lhs', symbols).value | get_param('rhs', symbols).value;
    },
    xor : function (symbols) {
        return get_param('lhs', symbols).value ^ get_param('rhs', symbols).value;
    },
    not : function (symbols) {
        return ~get_param('x', symbols).value;
    },
    shift_left : function (symbols) {
        return get_param('lhs', symbols).value << get_param('rhs', symbols).value;
    },
    shift_right : function (symbols) {
        return get_param('lhs', symbols).value >> get_param('rhs', symbols).value;
    },
    shift_right_unsigned : function (symbols) {
        return get_param('lhs', symbols).value >>> get_param('rhs', symbols).value;
    },

    // array
    length : function (symbols) {
        return get_param('x', symbols).value.length;
    },
    join : function (symbols) {
        return get_param('x', symbols).value.concat(get_param('y', symbols).value);
    },
    subarray : function (symbols) {
        return get_param('x', symbols).value.slice(get_param('start', symbols).value, get_param('end', symbols).value);
    },
};


module.exports = natives;

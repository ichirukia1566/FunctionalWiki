"use strict";

var natives = {
    plus : function (symbols) {
        return symbols.lhs[0].value + symbols.rhs[0].value;
    },
    minus : function (symbols) {
        return symbols.lhs[0].value - symbols.rhs[0].value;
    },
    times : function (symbols) {
        return symbols.lhs[0].value * symbols.rhs[0].value;
    },
    over : function (symbols) {
        return symbols.lhs[0].value / symbols.rhs[0].value;
    },
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
    true : function () {
        return true;
    },
    false : function () {
        return false;
    },
};




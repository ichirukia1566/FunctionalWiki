"use strict";

var natives = {
    if : function (symbols) {
        return symbols.cond.value ? symbols.then.value : symbols.else.value;
    },
    '+' : function (symbols) {
        return symbols['@this'].value + symbols.rhs.value;
    },
    '-' : function (symbols) {
        return symbols['@this'].value - symbols.rhs.value;
    },
    '*' : function (symbols) {
        return symbols['@this'].value * symbols.rhs.value;
    },
    '>' : function (symbols) {
        return symbols['@this'].value > symbols.rhs.value;
    },
    true : function () {
        return true;
    },
    false : function () {
        return false;
    },
};

var built_in_types = {
    Boolean : {},
    Float : {},
    Character : {},
    Integer : {
        '>' : {
            type : {
                kind : "function",
                parameter : built_in_type("Integer"),
                return : built_in_type("Boolean"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Integer"),
                    },
                ],
                body : {
                    node : "native",
                    native : ">",
                    type : built_in_type("Boolean")
                },
                symbols : {}
            }
        },
        '+' : {
            type : {
                kind : "function",
                parameter : built_in_type("Integer"),
                return : built_in_type("Integer"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Integer"),
                    },
                ],
                body : {
                    node : "native",
                    native : "+",
                    type : built_in_type("Integer")
                },
                symbols : {}
            }
        },
        '-' : {
            type : {
                kind : "function",
                parameter : built_in_type("Integer"),
                return : built_in_type("Integer"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Integer"),
                    },
                ],
                body : {
                    node : "native",
                    native : "-",
                    type : built_in_type("Integer")
                },
                symbols : {}
            }
        },
        '*' : {
            type : {
                kind : "function",
                parameter : built_in_type("Integer"),
                return : built_in_type("Integer"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Integer"),
                    },
                ],
                body : {
                    node : "native",
                    native : "*",
                    type : built_in_type("Integer")
                },
                symbols : {}
            }
        },
    }
};



"use strict";

function built_in_type(name) {
    return {
        kind : "native",
        built_in : name
    };
}
var natives = {
    if : function (symbols) {
        return symbols.cond.value ? symbols.then.value : symbols.else.value;
    },
    plus : function (symbols) {
        return symbols['@this'].value + symbols.rhs.value;
    },
    minus : function (symbols) {
        return symbols['@this'].value - symbols.rhs.value;
    },
    times : function (symbols) {
        return symbols['@this'].value * symbols.rhs.value;
    },
    divide : function (symbols) {
        return symbols['@this'].value / symbols.rhs.value;
    },
    Integer : {
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
                    native : "plus",
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
                    native : "minus",
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
                    native : "times",
                    type : built_in_type("Integer")
                },
                symbols : {}
            }
        },
        '/' : {
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
                    native : "divide",
                    type : built_in_type("Integer")
                },
                symbols : {}
            }
        },
    },
    Float : {
        '+' : {
            type : {
                kind : "function",
                parameter : built_in_type("Float"),
                return : built_in_type("Float"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Float"),
                    },
                ],
                body : {
                    node : "native",
                    native : "plus",
                    type : built_in_type("Float"),
                },
                symbols : {}
            }
        },
        '-' : {
            type : {
                kind : "function",
                parameter : built_in_type("Float"),
                return : built_in_type("Float"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Float"),
                    },
                ],
                body : {
                    node : "native",
                    native : "minus",
                    type : built_in_type("Float"),
                },
                symbols : {}
            }
        },
        '*' : {
            type : {
                kind : "function",
                parameter : built_in_type("Float"),
                return : built_in_type("Float"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Float"),
                    },
                ],
                body : {
                    node : "native",
                    native : "times",
                    type : built_in_type("Float"),
                },
                symbols : {}
            }
        },
        '/' : {
            type : {
                kind : "function",
                parameter : built_in_type("Float"),
                return : built_in_type("Float"),
            },
            value : {
                parameters : [
                    {
                        name : "rhs",
                        type : built_in_type("Float"),
                    },
                ],
                body : {
                    node : "native",
                    native : "divide",
                    type : built_in_type("Float"),
                },
                symbols : {}
            }
        },
    }
};

function InterpreterError() {
    Error.apply(this, arguments);
    this.name = "InterpreterError";
}
InterpreterError.prototype = Object.create(Error.prototype);

function error(message) {
    alert(message);
    throw new InterpreterError(message);
}

function generate_function_type(parameters, return_type, symbols) {
    parameters = parameters.slice();
    if (parameters.length === 1) {
        return {
            kind : 'function', 
            parameter : resolve_type(parameters[0].type, symbols), 
            return : return_type
        };
    } else if (parameters.length > 1)  {
        var param = parameters.shift();
        return {
            kind : 'function', 
            parameter : resolve_type(param.type, symbols), 
            return : generate_function_type(parameters, return_type, symbols)
        };
    }
};

/** Make a copy of the symbol table to be stored in closures
 * @param symbols
 * @return object
 */
function copy_symbols(symbols) {
    var copy = {};
    for (var name in symbols) {
        if (symbols.hasOwnProperty(name)) {
            copy[name] = symbols[name];
        }
    }
    return copy;
}

function resolve_type(type, symbols) {
    if (type.kind === "identifier") {
        var class_ = evaluate(type.qualified_id, symbols, true);
        if (class_.type.kind === 'class') {
            return {
                kind : "object",
                class : class_.value
            };
        } else if (class_.type.kind === 'type') {
            return  class_.value;
        } else {
            error("Symbol resolves to non-type in a type context");
        }
    } else {
        return type;
    }
}

/** Check if the types are compatible
 * @param declared
 * @param actual
 * @return bool
 */
function compatible(declared, actual, symbols) {
    declared = resolve_type(declared, symbols);
    actual = resolve_type(actual, symbols);
    if (declared.kind !== actual.kind) {
        return false;
    }
    var comparator = {
        array : function () {
            return compatible(declared.elements, actual.elements, symbols);
            // is the original line (below) a typo?
            //return compatible(declared.elements, declared.elements, symbols);
        },
        function : function() {
            return compatible(declared.return, actual.return, symbols) 
                && compatible(actual.parameter, declared.parameter, symbols);
        },
        template : function () {
            error("A template is not a type");
        },
        object : function () {
            // TODO: possibility of infinite recursion
            for (var member in declared.value) {
                if (actual.value[member] === undefined) {
                    return false;
                }
                if (!compatible(declared.value[member], actual.value[member], symbols)) {
                    return false;
                }
            }
            return true;
        },
        native : function () {
            return declared.built_in === actual.built_in;
        }
    };
    return comparator[declared.kind]();
}

function use_constructor(class_obj) {
    var constructor = class_obj.value['@constructor'];
    if (constructor === undefined) {
        error("Cannot use a class without a constructor as a value");
    }
}

/** Add a symbol into the symbol table
 */
function declare(node, symbols, check_only) {
    var method = {
        import : function () { 
            error("Not implemented");
        },
        template : function () {
            symbols[node.name] = {
                type : {
                    kind : "template"
                },
                template_parameters : node.template_parameters,
                content : node.content
            };
        },
        class : function () {
            symbols[node.name] = {
                type : {
                    kind : "class",
                    superclass : resolve_type(node.superclass, symbols)
                },
            };
            symbols[node.name] = evaluate(node, symbols, true);
        },
        var : function () {
            // add myself to symbol table to support recursion
            // Return type must be specified for recursion
            if (node.type !== null) {
                symbols[node.name] = {type : generate_function_type(node.parameters, resolve_type(node.type, symbols), symbols)};
            }
            // TODO: mutual recursion

            // translate the declaration into a function expression
            symbols[node.name] = evaluate(node, symbols, check_only);
        },
    }
    method[node.node]();
}

/** Evaluate an AST node 
 * @param node
 * @return object A value node
 */
function evaluate(node, symbols, check_only) {
    var evaluater = {
        program : function () {
            node.imports.forEach(
                function (child) {
                    declare(child, symbols, check_only);
                }
            );
            node.declarations.forEach(
                function (child) {
                    declare(child, symbols, check_only);
                }
            );
            return evaluate(node.expression, symbols, check_only);
        },
        class : function () {
            var ans = {
                type : {
                    kind : "class",
                },
                value : {
                    superclass : resolve_type(node.superclass, symbols),
                    static_members : {}, // store the value directly
                    members : {} // store the AST
                }
            };
            var class_symbols = copy_symbols(symbols);
            ans.value.forEach(
                function (m) {
                    // static members
                    if (m.node !== 'member') {
                        declare(m, class_symbols, check_only);
                        ans.value.static_members[m.name] = class_symbols[m.name];
                    }
                }
            );
            ans.value.forEach(
                function (m) {
                    if (m.node === 'member') {
                        // directly store the AST, only check at point of usage
                        ans.type.members[m.name] = m;
                    }
                }
            );
            return ans;
        },
        var : function () {
            return evaluate(
                {
                    node : "function",
                    parameters : node.parameters,
                    type : node.type,
                    body : node.initialiser
                }
                , symbols
                , check_only
            );
        },
        template_application : function () {
            // resolve template arguments
            var template = evaluate(node.template, symbols, true);
            var args = node.arguments.map(
                function (a) {
                    return resolve_type(a, symbols, true);
                }
            );
            // put the template arguments into the parameters
            if (template.type.kind !== "template") {
                if (template.type.kind === "array" && template.value.elements.length === 0) {
                    // empty array
                    if (node.arguments.length !== 1) {
                        error("Exactly 1 type must be specified as the template argument of an empty array");
                    }
                    return {
                        type : {
                            kind : "array",
                            elements : node.arguments[0]
                        },
                        value : []
                    };
                } else {
                    error("Cannot apply template arguments into a non-template");
                }
            }
            if (template.template_parameters.length === node.arguments.length) {
                var template_symbols = copy_symbols(symbols);
                for (var i = 0; i < args.length; ++i) {
                    template_symbols[template.template_parameters[i]] = {
                        type : {
                            kind : 'type'
                        },
                        value : args[i]
                    };
                }
                return evaluate(template.content, template_symbols, check_only);
            } else {
                error("Partial template application is not yet implemented");
            }
        },
        member : function () {
            var object = evaluate(node.object, symbols, check_only);
            var type = resolve_type(object.type, symbols);
            switch (type.kind) {
                case "class":
                    error("Not implemented");
                case "native": {
                    var ans = built_in_types[type.built_in][node.member];
                    if (ans === undefined) {
                        error("Member does not exist in this built-in type");
                    }
                    ans.value.symbols['@this'] = object;
                    return ans;
                }
                case "array":
                    if (node.member === "length") {
                        return {
                            type : {
                                kind : "Integer"
                            },
                            value : object.value.length
                        };
                    }
                    // fallthrough
                default:
                    error("Not implemented");
            }
        },
        native : function () {
            return {
                type : node.type,
                value : check_only ? undefined : natives[node.native](symbols)
            };
        },
        call : function () {
            // evaluate the arguments
            var lhs = evaluate(node.function, symbols, check_only);
            var rhs = evaluate(node.argument, symbols, check_only);

            // call the function
            var type = resolve_type(lhs.type, symbols);
            if (type.kind === 'array') {
                if (!compatible(built_in_type('Integer'), rhs.type, symbols)) {
                    error("Array index must be an integer");
                }
                if (check_only) {
                    return {type : lhs.type[1]};
                } else {
                    if (rhs.value >= 0 && rhs.value < lhs.value.length) {
                        return {type : lhs.type[1], value : lhs.value[rhs.value]};
                    } else {
                        error("Array index overflow");
                    }
                }
            } else if (type.kind === 'function') {
                if (!compatible(type.parameter, rhs.type, symbols)) {
                    error("Argument type does not match parameter type");
                }
                if (check_only) {
                    return {type : type.return};
                } else {
                    var closure_symbols = copy_symbols(lhs.value.symbols);
                    var param = lhs.value.parameters[0];
                    var remaining_params = lhs.value.parameters.slice(1);
                    closure_symbols[param.name] = {type : param.type, value : rhs.value};
                    if (remaining_params.length === 0) {
                        return {
                            type : type.return,
                            value : evaluate(
                                lhs.value.body
                                , closure_symbols
                            ).value,
                        };
                    } else {
                        return {
                            type : type.return,
                            value : {
                                parameters : remaining_params,
                                body : lhs.value.body,
                                symbols : closure_symbols
                            }
                        };
                    }
                }
            } else if (resolve_type(lhs.type, symbols).kind === 'template') {
                error("Template argument deduction is not yet implemented");
            } else {
                error("Cannot call a value other than a function or an array");
            }
        },
        built_in_type() {
            return {
                type : {
                    kind : "type",
                },
                value : node.type
            };
        },
        identifier : function () {
            if (symbols[node.name] === undefined) {
                error("Cannot resolve symbol " + node.name);
            }
            /*
            if (symbols[node.name].type.kind === 'class') {
                return symbols[node.name].value['@constructor'];
            }
            */
            return symbols[node.name];
        },
        this : function () {
            var ans = symbols['@this'];
            if (ans === undefined) {
                error("Cannot use @this in a non-class context");
            }
            return ans;
        },
        function : function () {
            var closure_symbols = copy_symbols(symbols);
            var parameters = node.parameters;
            parameters.forEach(
                function (p) {
                    closure_symbols[p.name] = {type : p.type, value : undefined};
                }
            );
            var body_type = evaluate(node.body, closure_symbols, true).type;
            if (node.type !== null && !compatible(node.type, body_type, symbols)) {
                error("Type of function body does not match declared type");
            }
            var return_type = node.type === null ? body_type : resolve_type(node.type, symbols);
            if (parameters.length === 0) {
                return {
                    type : return_type,
                    value : evaluate(node.body, symbols).value
                };
            } else {
                return {
                    type : generate_function_type(node.parameters, return_type, symbols),
                    value : {
                        parameters : node.parameters,
                        body : node.body,
                        symbols : symbols
                    }
                };
            }
        },
        array : function () {
            // do not support empty array due to type ambiguity
            // empty array literal must be used in form of template application
            var type = node.elements.length ? evaluate(node.elements[0], symbols).type : undefined;
            for (var i = 1; i < node.elements.length; ++i) {
                if (
                    !compatible(
                        type
                        , evaluate(node.elements[i], symbols).type
                        , symbols
                    )
                ) {
                    error("Array literal contains inconsistent types");
                }
            }
            return {
                type : {
                    kind : "array",
                    elements : type
                },
                value : node.map(
                    function (e) {
                        return evaluate(e, symbols).value;
                    }
                )
            };
        },
        literal : function () {
            return {type : node.type, value : node.value};
        }
    };
    var ans = evaluater[node.node]();
    return ans;
}

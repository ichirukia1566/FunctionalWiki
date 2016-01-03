Array.prototype.clone = function() {
    return this.slice();
};

/** Check if the types are the same
 * @param x
 * @param y
 * @return bool
 */
function type_equals(x, y) {
    // TODO
}

/** Parse an AST node 
 * @param node
 * @param check_only Do type check only without evaluating
 * @return object A value node
 */
function parse(node, symbols, check_only) {
    var parser = {
        program : function () {
            // TODO
        },
        import : function () {
            // TODO
        },
        class : function () {
            // TODO
        },
        var : function () {
            // TODO
        },
        constructor : function () {
            // TODO
        },
        static : function () {
            // TODO
        },
        member : function () {
            // TODO
        },
        call : function () {
            var lhs = parse(node.function, symbols, check_only);
            if (lhs.type[0] === '@array') {
                var rhs = parse(node.argument, symbols, check_only);
                if (!type_equals(['std', 'Integer'], rhs.type)) {
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
            } else if (lhs.type[0] === '@function') {
                var rhs = parse(node.argument, symbols, check_only);
                if (!type_equals(lhs.type[1], rhs.type)) {
                    error("Argument type does not match parameter type");
                }
                if (check_only) {
                    return {type : lhs.type[2]};
                } else {
                    var closure_symbols = lhs.value.symbols.clone();
                    var param = lhs.value.parameters[0];
                    var remaining_params = lhs.value.parameters.slice(1);
                    closure_symbols[param.name] = {param.type, rhs.value};
                    if (remaining_params.length === 0) {
                        return {
                            type : lhs.type[2],
                            value : parse(lhs.value.body, closure_symbols, check_only).value,
                        };
                    } else {
                        return {
                            type : lhs.type[2],
                            value : {
                                parameters : remaining_params,
                                body : lhs.value.body,
                                symbols : closure_symbols
                            }
                        };
                    }
                }
            } else if (lhs.type[0] === '@template') {
                // TODO
            } else {
                error("Cannot call a value other than a function or an array");
            }
        },
        template_application : function () {
            // TODO
        },
        identifier : function () {
            if (symbols[node.name] === undefined) {
                error("Cannot resolve symbol " + node.name);
            }
            return symbols[node.name];
        },
        function : function () {
            var closure_symbols = symbols.clone();
            parameters.forEach(
                function (p) {
                    closure_symbols[p.name] = {type : p.type, value : undefined};
                }
            );
            var body_type = parse(node.body, closure_symbols, true);
            if (node.type === null && !type_equals(node.type, body_type)) {
                error("Type of function body does not match declared type");
            }
            var return_type = node_type === null ? body_type : node_type;
            if (parameters.length === 0) {
                return {
                    type : return_type,
                    value : parse(node.type, symbols, check_only).value
                };
            } else {
                var generate_type = function (parameters) {
                    if (parameters.length === 1) {
                        return {
                            type : ['@function', parameters[0].type, return_type]
                        };
                    } else {
                        var param = parameters.shift();
                        var child = generate_type(parameters);
                        return {
                            type : ['@function', parameters[0].type, child.type]
                        };
                    }
                };
                return {
                    type : generate_type(node.parameters),
                    value : {
                        parameters : node.parameters,
                        body : node.body,
                        symbols : symbols
                    }
                };
            }
        },
        array : function () {
            if (node.elements.length === 0) {
                // TODO: Treat it as @template<T>[T]
            } else {
                var type = parse(node.elements[0], symbols, true).type;
                for (var i = 1; i < node.elements.length; ++i) {
                    if (
                        !type_equals(
                            type
                            , parse(node.elements[i], symbols, true).type
                        )
                    ) {
                        error("Array literal contains inconsistent types");
                    }
                }
                return {
                    type : ['@array', type], 
                    value : check_only ? undefined : node.map(
                        function (e) {
                            return parse(e, symbols).value;
                        }
                    )
                };
        },
        literal : function () {
            return {type : ['std', node.type], value : node.value};
        }
    };
}

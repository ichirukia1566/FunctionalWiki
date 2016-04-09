"use strict";

var stack = [];
var natives = require('./natives');

function InterpreterError(message, loc) {
    this.name = "InterpreterError";
    this.message = message;
    stack.unshift(loc);
    this.call_stack = stack.slice();
    stack = [];
}

InterpreterError.prototype = Object.create(Error.prototype);
InterpreterError.prototype.toString = function () {
    var message = 
        this.message 
        + "\n\n"
        + "Call stack:\n";
    this.call_stack.forEach(
        function (layer, index) {
            message += "#" + index + ": file " + layer.title + " line " + layer.start.line + " column " + layer.start.column + "\n";
        }
    );
    return message;
}

function NotImplementedException(message) {
    this.name = "NotImplementedException";
    this.message = message;
}
NotImplementedException.prototype = Object.create(Error.prototype);

module.exports.errors = {
    InterpreterError : InterpreterError,
    NotImplementedException : NotImplementedException,
};

function Type() {}

function ErrorType() {
    this.name = "@error";
}
ErrorType.prototype = Object.create(Type.prototype);
ErrorType.prototype.compatibleWith
    = function () {
        return true;
    };

function NativeType(name) {
    this.name = name;
}
NativeType.prototype = Object.create(Type.prototype);
NativeType.prototype.compatibleWith
    = function (declared_type) {
        return declared_type instanceof NativeType
            && declared_type.name === this.name;
    };
NativeType.prototype.toString = function () {
    return this.name;
};
NativeType.prototype.print = function (value) {
    return String(value);
}
NativeType.Integer = new NativeType("@Integer");
NativeType.Float = new NativeType("@Float");
NativeType.Character = new NativeType("@Character");
NativeType.Boolean = new NativeType("@Boolean");
NativeType.Null = new NativeType("@Null");

function ArrayType(elements) {
    this.elements = elements;
}
ArrayType.prototype = Object.create(Type.prototype);
ArrayType.prototype.compatibleWith
    = function (declared_type) {
        return declared_type instanceof ArrayType
            && (
                this.elements === undefined
                || (
                    declared_type.elements !== undefined
                    && this.elements.compatibleWith(declared_type.elements)
                )
            );
    };
ArrayType.prototype.toString
    = function () {
        if (this.elements === undefined) {
            return "[]";
        }
        return "[" + this.elements.toString() + "]"
    };
ArrayType.prototype.print = function (value) {
    if (this.elements.compatibleWith(NativeType.Character)) {
        return value.join('');
    }
    var ans = "[";
    var first = true;
    var type = this;
    value.forEach(
        function (element) {
            if (first) {
                first = false;
            } else {
                ans += ", ";
            }
            ans += type.elements.print(element);
        }
    );
    ans += "]";
    return ans;
}

function FunctionType(parameter, r) {
    this.parameter = parameter;
    this.return = r;
}
FunctionType.prototype = Object.create(Type.prototype);
FunctionType.prototype.toString
    = function () {
        return this.parameter.toString() + " " + this.return.toString();
    };
FunctionType.prototype.print = function (value) {
    return "Function (" + this.parameter + " " + this.return + ")";
}
FunctionType.prototype.compatibleWith
    = function (declared_type) {
        return declared_type instanceof FunctionType
            && this.return.compatibleWith(declared_type.return)
            && declared_type.parameter.compatibleWith(this.parameter);
    };

function ClassType(name, superclass, members, initialisers) {
    this.name = name;
    this.superclass = superclass;
    this.members = members;
    this.initialisers = initialisers;
}

ClassType.prototype = Object.create(Type.prototype);
ClassType.prototype.toString = function () {
    return this.name;
};
ClassType.prototype.print = function (value) {
    var ans = "{\n";
    for (var name in value) {
        ans += "\t" + name + " : " + value['@class'].members[name].print(value) + "\n";
    }
    ans += "}";
    return ans;
};
ClassType.prototype.compatibleWith
    = function (declared_type) {
        function must_exist_and_compatible(actual, declared) {
            return actual != null /* maybe undefined */ && actual.compatibleWith(declared);
        }

        if (!(declared_type instanceof ClassType)) {
            return false;
        }

        if (this.superclass !== null && this.superclass.compatibleWith(declared_type)) {
            return true;
        }
        if (declared_type.superclass !== null && !must_exist_and_compatible(this.superclass, declared_type.superclass)) {
            return false;
        }
        // for named types, compare by name
        if (this.name !== null && declared_type.name !== null) {
            return this.name === declared_type.name;
        } else {
            // if any one is an unnamed class (resulting from template), compare
            // by structure
            for (var name in declared_type.members) {
                if (!must_exist_and_compatible(this.members[name], declared_type.members[name])) {
                    return false;
                }
            }
            return true;
        }
    };

/** Get the type of a particular member
 */
ClassType.prototype.findMember = function(name) {
    if (this.members[name] !== undefined) {
        return this.members[name];
    } else if (this.superclass === null) {
        return null;
    } else {
        return this.superclass.findMember(name);
    }
};

/** Get the types of all members, including inherited
 */
ClassType.prototype.getAllMembers = function () {
    var base = this.superclass === null 
        ? Object.create(null) 
        : this.superclass.getAllMembers();
    for (var name in this.members) {
        base[name] = this.members[name];
    }
    return base;
}

module.exports.types = {
    Type : Type,
    ErrorType : ErrorType,
    NativeType : NativeType,
    ArrayType : ArrayType,
    ClassType : ClassType,
    FunctionType : FunctionType,
};

function Value(type, value) {
    this.type = type;
    this.value = value;
}
Value.prototype = {};
Value.prototype.toString = function () {
    return this.type.print(this.value);
}

module.exports.Value = Value;

function copy_symbols(symbols) {
    var copy = Object.create(null);
    for (var name in symbols) {
        if (symbols[name] instanceof Array) {
            copy[name] = symbols[name].slice();
        } else {
            copy[name] = symbols[name];
        }
    }
    return copy;
}

/** Ensure_that node is overloadable on symbols if it has new_type 
 */
function check_overload(symbols, name, new_type) {
    if (symbols[name] !== undefined) {
        if (!(new_type instanceof FunctionType)) {
            throw new InterpreterError("Cannot overload a non-function", loc);
        }
        symbols[name].forEach(
            function (variant) {
                if (variant instanceof ClassType) {
                    throw new InterpreterError(name + " has already been declared as a class", loc);
                } else if (variant instanceof Template) {
                    throw new InterpreterError(name + " has already been declared as a template", loc);
                } else if (variant.type instanceof FunctionType) {
                    if (
                        variant.type.parameter.compatibleWith(new_type.parameter)
                        || new_type.parameter.compatibleWith(variant.type.parameter)
                    ) {
                        throw new InterpreterError("An overload of compatible parameter already exists.", loc);
                    }
                } else {
                    throw new InterpreterError("Cannot overload a non-function", loc);
                }
            }
        );
    }
}

function generate_function_type(parameter_types, type) {
    if (parameter_types.length === 0) {
        return type;
    }
    return new FunctionType(
        parameter_types[0]
        , generate_function_type(parameter_types.slice(1), type)
    );
}


/** Make a copy of the symbol table to be stored in closures
 * @param symbols
 * @return object
 */
function Node() {}
Node.prototype = {
    error : function (message) {
        throw new InterpreterError(message, this.location);
    }
};

function TypeExpression() {}
TypeExpression.prototype = Node.prototype;

function TypeLiteral(type, loc) {
    this.type = type;
    this.location = loc;
}
TypeLiteral.prototype = Object.create(TypeExpression.prototype);
TypeLiteral.prototype.evaluate = function () {
    return this.type;
};
TypeLiteral.prototype.toString = function () {
    return this.type.toString();
}

function ArrayTypeExpression(elements, loc) {
    this.elements = elements;
    this.location = loc;
}
ArrayTypeExpression.prototype = Object.create(TypeExpression.prototype);
ArrayTypeExpression.prototype.evaluate = function (symbols) {
    return new ArrayType(this.elements.evaluate(symbols));
};
ArrayTypeExpression.prototype.toString = ArrayType.prototype.toString;

function FunctionTypeExpression(parameter, r, loc) {
    this.parameter = parameter;
    this.return = r;
    this.location = loc;
}
FunctionTypeExpression.prototype = Object.create(TypeExpression.prototype);
FunctionTypeExpression.prototype.evaluate = function (symbols) {
    return new FunctionType(this.parameter.evaluate(symbols), this.return.evaluate(symbols));
};
FunctionTypeExpression.prototype.toString = FunctionType.prototype.toString;

function IdentifierTypeExpression(qualified_id, loc) {
    this.name = qualified_id;
    this.location = loc;
}
IdentifierTypeExpression.prototype = Object.create(TypeExpression.prototype);
IdentifierTypeExpression.prototype.evaluate = function (symbols) {
    var ans = (new Identifier(this.name, this.location))
        .evaluate(symbols, true, undefined, true);
    if (!(ans instanceof Type)) {
        this.error("Non-type argument specified in type context");
    }
    return ans;
};
IdentifierTypeExpression.prototype.toString = function () {
    return this.name.toString();
}

function Article(segments, loc) {
    this.name = null;
    this.segments = [];
    var node = this;
    segments.forEach(
        function (segment) {
            if (
                typeof segment === "string"
                && typeof node.segments[node.segments.length - 1] === "string"
            ) {
                node.segments[node.segments.length - 1] += segment;
            } else {
                node.segments.push(segment);
            }
        }
    );
    this.location = loc;
}
Article.prototype = Object.create(Node.prototype);
Article.prototype.evaluate = function (symbols, no_std) {
    if (!no_std) {
        load_std_lib(symbols);
    }
    // parse all segments
    var intermediates = this.segments.map(
        function (segment) {
            if (typeof segment === "string") {
                return {
                    value : new Value(new ArrayType(NativeType.Character), [...segment]), 
                    location : dummy_location,
                };
            } else {
                return {
                    value : segment.evaluate(symbols), 
                    location : segment.location,
                };
            }
        }
    );
    // convert all results to Text
    var text_type = new IdentifierTypeExpression("Text" , dummy_location)
        .evaluate(symbols);
    var results = intermediates.map(
        function (segment) {
            var result = new Call(
                // XXX: hard-coded
                new Identifier("text", segment.location)
                , new Literal(segment.value, segment.location)
                , segment.location
            ).evaluate(symbols);
            if (!result.type.compatibleWith(text_type)) {
                throw new InterpreterError("Segment cannot be converted into document text", segment.location);
            }
            return result.value;
        }
    );
    return new Update(
        new Identifier("TextSequence", dummy_location)
        , [
            {
                name : "content", 
                value : new Literal(
                    new Value(new ArrayType(text_type), results)
                ),
            }
        ]
    ).evaluate(symbols);
}

function Declaration() {}
Declaration.prototype = Object.create(Node.prototype);

var do_import;
(function () {
    var cache = Object.create(null);
    do_import = function (from, loc) {
        var file;
        if (from.charAt(0) === '@') {
            file = 'articles/' + from.substring(1);
        } else {
            file = 'libraries/' + from;
        }
        if (cache[file] === undefined) {
            var title = from.replace(/^@/, '');
            var text;
            try {
                var fs = require('fs');
                text = fs.readFileSync(file, 'utf8');
            } catch (e) {
                throw new InterpreterError("The article/library to import " + title + " does not exist", loc);
            }
            
            var symbols = Object.create(null);
            require('./parser').parse(text, {title : title}).evaluate(symbols, from === 'std');
            cache[file] = symbols;
        }
        return cache[file];
    };
})();

var dummy_location = {
    name : "<internal>",
    start : {offset : 0, line : 0, column : 0},
    end : {offset : 0, line : 0, column : 0},
};

function load_std_lib(symbols) {
    var std = do_import('std', dummy_location);
    for (var i in std) {
        symbols[i] = std[i];
    }
}

function Import(from, identifier, to, loc) {
    this.from = from;
    this.identifier = identifier;
    this.to = to;
    this.location = loc;
}

Import.prototype = Object.create(Declaration.prototype);
Import.prototype.declare = function (symbols) {
    var import_symbols = do_import(this.from, this.location);
    var node = this;
    if (import_symbols[node.identifier] === undefined) {
        node.error(node.identifier + " does not exist in imported article");
    }
    if (node.to === null) {
        node.to = node.identifier;
    }
    import_symbols[node.identifier].forEach(
        function (overload) {
            if (overload instanceof Value) {
                if (symbols[node.to] === undefined) {
                    symbols[node.to] = [];
                }
                check_overload(symbols, node.to, overload.type, node.location);
                symbols[node.to].push(overload);
            } else {
                if (symbols[node.to] !== undefined) {
                    node.error(node.to + " has already been declared");
                }
                symbols[node.to] = [overload];
            }
        }
    );
}

function Class(name, superclass, members, loc) {
    this.name = name;
    this.superclass = superclass;
    this.members = members;
    this.location = loc;
}
Class.prototype = Object.create(Declaration.prototype);
Class.prototype.evaluate = function (symbols) {
    var node = this;
    var class_type = new ClassType(
        node.name
        , node.superclass === null ? null : node.superclass.evaluate(symbols)
        , Object.create(null)
        , Object.create(null)
    );
    node.members.forEach(
        function (member) {
            if (class_type.findMember(member.name) !== null) {
                node.error(member.name + " has already been declared");
            }
            class_type.members[member.name] 
                = generate_function_type(
                    member.parameters.map(
                        function (p) {
                            return p.type.evaluate(symbols);
                        }
                    )
                    , member.type.evaluate(symbols)
                );
            if (member.body !== null) {
                var initialiser 
                    = (new FunctionExpression(
                        member.parameters
                        , member.type
                        , member.body)
                    ).evaluate(symbols);
                if (
                    !initialiser.type.compatibleWith( 
                        class_type.members[member.name]
                    )
                ) {
                    node.error(
                        "Default value of member " 
                        + member.name 
                        + " in class " 
                        + node.name 
                        + " is not compatible with its declared type."
                    );
                }
                class_type.initialisers[member.name] = initialiser.value;
            }
        }
    );
    return class_type;
};
Class.prototype.declare = function (symbols) {
    if (symbols[this.name] !== undefined) {
        this.error(this.name + " has already been declared");
    }
    symbols[this.name] = [this.evaluate(symbols)];
};

function Variable(name, parameters, type, body, loc) {
    this.name = name;
    this.parameters = parameters;
    this.type = type;
    this.body = body;
    this.location = loc;
}
Variable.prototype = Object.create(Declaration.prototype);
Variable.prototype.evaluate = function (symbols, check_only) {
    // add myself to symbol table to support recursion
    // Return type must be specified for recursion
    symbols = copy_symbols(symbols);
    var type;
    if (this.name !== null && this.type !== null) {
         type = generate_function_type(
             this.parameters.map(
                 function (p) {
                     return p.type.evaluate(symbols);
                 }
             )
             , this.type.evaluate(symbols)
         );
         check_overload(symbols, this.name, type, this.location);
         if (symbols[this.name] === undefined) {
             symbols[this.name] = [];
         }
         symbols[this.name].push(new Value(type, undefined));
    }
    // transform to function expression
    // mutual recursion is currently not supported
    var initialiser
        = (new FunctionExpression(this.parameters, this.type, this.body, this.location))
            .evaluate(symbols, check_only);
    if (type === undefined) {
        type = initialiser.type;
    }
    return new Value(type, initialiser.value);
};
Variable.prototype.declare = function (symbols, check_only) {
    var initialiser = this.evaluate(symbols, check_only);
    check_overload(symbols, this.name, initialiser.type, this.location);
    if (symbols[this.name] === undefined) {
        symbols[this.name] = [initialiser];
    } else {
        symbols[this.name].push(initialiser);
    }
    // needed for proper recursion
    if (initialiser.type instanceof FunctionType) {
        initialiser.value.symbols[this.name] = symbols[this.name];
    }
};

function Template(name, parameters, content, loc) {
    this.name = name;
    this.parameters = parameters;
    this.content = content;
    this.location = loc;
}
Template.prototype = Object.create(Declaration.prototype);
Template.prototype.declare = function (symbols) {
    if (symbols[this.name] !== undefined) {
        this.error(this.name + "has already been declared");
    }
    symbols[this.name] = [this];
};

function Expression() {}
Expression.prototype = Object.create(Node.prototype);

function Program(imports, declarations, expression, loc) {
    this.imports = imports;
    this.declarations = declarations;
    this.expression = expression;
    this.location = loc;
}
Program.prototype = Object.create(Expression.prototype);
Program.prototype.evaluate = function (symbols, check_only) {
    this.imports.forEach(
        function (child) {
            child.declare(symbols, check_only);
        }
    );
    this.declarations.forEach(
        function (child) {
            child.declare(symbols, check_only);
        }
    );
    if (this.expression === null) {
        return new Value(NativeType.Null, null);
    } else {
        return this.expression.evaluate(symbols, check_only);
    }
};

function Update(object, update, loc) {
    this.object = object;
    this.update = update;
    this.location = loc;
}
Update.prototype = Object.create(Expression.prototype);
Update.prototype.evaluate = function (symbols, check_only) {
    var node = this;
    function update_members(object) {
        var new_object = new Value(object.type, copy_symbols(object.value));
        node.update.forEach(
            function (assignment) {
                var name = assignment.name;
                var init = assignment.value.evaluate(symbols, check_only);
                var member_type = new_object.type.findMember(name);
                if (member_type === null) {
                    node.error("Member " + name + " does not exist");
                }
                if (!init.type.compatibleWith(member_type)) {
                    node.error("Member " + name + " has the wrong type");
                }
                new_object.value[name] = init.value;
            }
        );
        return new_object;
    }
    var object = this.object.evaluate(symbols, check_only, undefined, true);
    if (object instanceof ClassType) {
        if (check_only) {
            return new Value(object, undefined);
        }
        // create a new instance of the class
        var value = Object.create(null);
        value['@class'] = object;
        var new_object = update_members(new Value(object, value));
        // assign the default values to remaining members
        for (var name in object.getAllMembers()) {
            if (new_object.value[name] === undefined) {
                var c = object;
                var initialiser;
                while (c !== null) {
                    if (c.initialisers[name] !== undefined) {
                        initialiser = c.initialisers[name];
                        break;
                    }
                    c = c.superclass;
                }
                if (initialiser === undefined) {
                    node.error(
                        "Member " 
                        + name 
                        + " has no default value. A user-supplied value must be given."
                    );
                }
                new_object.value[name] = initialiser;
            }
        }
        return new_object;
    } else if (object.type instanceof ClassType) {
        return check_only ? object : update_members(object);
    } else {
        this.error("Cannot update members of a non-class object");
    }
}

function Call(f, argument, loc) {
    this.function = f;
    this.argument = argument;
    this.location = loc;
}
Call.prototype = Object.create(Expression.prototype);
Call.prototype.evaluate = function (symbols, check_only) {
    // evaluate the arguments
    var rhs = this.argument.evaluate(symbols, check_only);
    var lhs = this.function.evaluate(symbols, check_only, rhs.type);

    // call the function
    var type = lhs.type;
    if (type instanceof ArrayType) {
        if (lhs.type.elements === undefined) {
            this.error("Cannot dereference an empty array");
        }
        if (!rhs.type.compatibleWith(NativeType.Integer)) {
            this.error("Array index must be an integer");
        }
        if (check_only) {
            return new Value(lhs.type.elements, undefined)
        } else {
            if (rhs.value >= 0 && rhs.value < lhs.value.length) {
                return new Value(lhs.type.elements, lhs.value[rhs.value]);
            } else {
                this.error(
                    "Array index overflow (index " 
                    + rhs.value 
                    + " called with an array of length " 
                    + lhs.value.length
                    + 
                    ")"
                );
            }
        }
    } else if (type instanceof FunctionType) {
        if (!rhs.type.compatibleWith(type.parameter)) {
            this.error("Argument type " + rhs.type + " does not match parameter type " + type.parameter);
        }
        if (check_only) {
            return new Value(type.return, undefined);
        } else {
            var closure_symbols = copy_symbols(lhs.value.symbols);
            closure_symbols[lhs.value.parameter.name] 
                = [new Value(type.parameter, rhs.value)];
            stack.unshift(this.location);
            var result = lhs.value.body.evaluate(closure_symbols);
            stack.shift();
            if (!result.type.compatibleWith(type.return)) {
                this.error("Internal error: should have been checked already");
            }
            return new Value(type.return, result.value);
        }
    } else {
        this.error("Cannot call a value other than a function or an array");
    }
};

function Literal(object, loc) {
    this.object = object;
    this.location = loc;
}
Literal.prototype = Object.create(Expression.prototype);
Literal.prototype.evaluate = function () {
    return this.object;
}

function ArrayLiteral(elements, loc) {
    this.elements = elements;
    this.location = loc;
}
ArrayLiteral.prototype = Object.create(Expression.prototype);
ArrayLiteral.prototype.evaluate = function (symbols, check_only) {
    var element_type = this.elements.length 
        ? this.elements[0].evaluate(symbols, check_only).type 
        : undefined;
    var node = this;
    var value = this.elements.map(
        function (e) {
            var object = e.evaluate(symbols, check_only);
            if (!(object.type.compatibleWith(element_type))) {
                if (element_type.compatibleWith(object.type)) {
                    element_type = object.type;
                } else {
                    node.error("Array literal contains inconsistent types: " + element_type + " and " + object.type);
                }
            }
            return object.value;
        }
    );
    return new Value(new ArrayType(element_type), value);
};

function Identifier(name, loc) {
    this.name = name;
    this.location = loc;
}
Identifier.prototype = Object.create(Expression.prototype);
Identifier.prototype.evaluate 
    = function (symbols, check_only, argument_type, type_acceptable) {
        if (symbols[this.name] === undefined) {
            this.error("Cannot resolve symbol " + this.name);
        }
        var ans;
        if (argument_type !== undefined) {
            // resolve overload
            symbols[this.name].forEach(
                function (variant) {
                    if (type_acceptable && (variant instanceof ClassType || variant instanceof Template)) {
                        ans = variant;
                    } else if (
                        variant instanceof Value
                        && variant.type instanceof ArrayType
                        && argument_type.compatibleWith(NativeType.Integer)
                    ) {
                        // array dereferencing
                        ans = variant;
                    } else if (
                        variant instanceof Value 
                        && variant.type instanceof FunctionType
                    ) {
                        if (argument_type.compatibleWith(variant.type.parameter)) {
                            ans = variant;
                        }
                    }
                }
            );
            if (ans === undefined) {
                this.error("Cannot resolve suitable overload of " + this.name);
            }
        } else {
            if (symbols[this.name].length > 1) {
                this.error(this.name + " is overloaded. Please select one by applying a template argument.");
            }
            ans = symbols[this.name][0];
        }
        if (!check_only && ans instanceof Value && ans.value === undefined) {
            this.error(this.name + " is not yet completely initialised");
        }
        if (!type_acceptable && !(ans instanceof Value)) {
            this.error("Non-value " + this.name + " used in value context");
        }
        return ans;
    };

function FunctionExpression(parameters, type, body, loc) {
    this.parameters = parameters;
    this.type = type;
    this.body = body;
    this.location = loc;
}
FunctionExpression.prototype = Object.create(Expression.prototype);
FunctionExpression.prototype.evaluate = function (symbols, check_only) {
    var node = this;
    function get_return_type(declared, actual) {
        if (declared !== null) {
            if (!actual.compatibleWith(declared)) {
                node.error(
                    "Type of function body " + actual 
                    + " does not match declared type " + declared
                );
            }
            return declared;
        } else {
            return actual;
        }
    }
    var type = this.type === null ? null : this.type.evaluate(symbols);
    // A function is a scope
    symbols = copy_symbols(symbols);
    switch (this.parameters.length) {
      case 0:
        var ans = this.body.evaluate(symbols, check_only);
        ans.type = get_return_type(type, ans.type);
        return ans;
      case 1:
        var param_type = this.parameters[0].type.evaluate(symbols);
        var closure_symbols = copy_symbols(symbols);
        closure_symbols[this.parameters[0].name] 
            = [new Value(param_type, undefined)];
        var return_type;
        // XXX: hack for template recursion
        if (type !== null && check_only) {
            return_type = type;
        } else {
            return_type = get_return_type(type, this.body.evaluate(closure_symbols, true).type);
        }
        return new Value(
            new FunctionType(param_type, return_type)
            , {
                parameter : this.parameters[0],
                body : this.body,
                symbols : copy_symbols(symbols),
            }
        );
      default:
        var transformed_node = new FunctionExpression(
            [this.parameters[0]]
            , null
            , new FunctionExpression(
                this.parameters.slice(1)
                , this.type
                , this.body
                , this.location
            )
            , this.location
        );
        return transformed_node.evaluate(symbols, check_only);
    }
};

function If(condition, if_true, if_false, loc) {
    this.condition = condition;
    this.then = if_true;
    this.else = if_false;
    this.location = loc;
}
If.prototype = Object.create(Expression.prototype);
If.prototype.evaluate = function (symbols, check_only) {
    // evaluate the condition
    var cond = this.condition.evaluate(symbols, check_only);
    if (!cond.type.compatibleWith(NativeType.Boolean)) {
        this.error("If condition must be a boolean");
    }
    var lhs_t = this.then.evaluate(symbols, true).type;
    var rhs_t = this.else.evaluate(symbols, true).type;
    var type;
    if (rhs_t.compatibleWith(lhs_t)) {
        type = lhs_t;
    } else if (lhs_t.compatibleWith(rhs_t)) {
        type = rhs_t;
    } else {
        this.error("The types between if-branches must be the same");
    }
    if (check_only) {
        return new Value(type, undefined);
    } else {
        return new Value(
            type
            , (cond.value ? this.then : this.else).evaluate(symbols).value
        );
    }
};

function Native(name, type, loc) {
    this.name = name;
    this.type = type;
    this.location = loc;
}
Native.prototype = Object.create(Expression.prototype);
Native.prototype.evaluate = function (symbols, check_only) {
    function cast(type, value) {
        if (type instanceof NativeType) {
            if (type.compatibleWith(NativeType.Integer)) {
                return value | 0;
            }
            if (type.compatibleWith(NativeType.Float)) {
                return Number(value);
            }
            if (type.compatibleWith(NativeType.Character)) {
                return [...String(value)][0];
            }
            if (type.compatibleWith(NativeType.Boolean)) {
                return Boolean(value);
            }
            if (type.compatibleWith(NativeType.Null)) {
                return null;
            }
        }
        if (type instanceof ArrayType) {
            if (!(value instanceof Array)) {
                value = [value];
            }
            return value.map(
                function (element) {
                    return cast(type.elements, element);
                }
            );
        }
        return value;
    }
    var value;
    if (check_only) {
        value = undefined;
    } else {
        value = natives[this.name](symbols, this.location);
    }
    var type = this.type.evaluate(symbols);
    return new Value(type, cast(type, value));
};

function TemplateApplication(template, args, loc) {
    this.template = template;
    this.arguments = args;
    this.location = loc;
}
TemplateApplication.prototype = Object.create(Expression.prototype);
TemplateApplication.prototype.evaluate = function (symbols, check_only) {
     // resolve template arguments
     var args = this.arguments.map(
         function (a) {
             return a.evaluate(symbols);
         }
     );
     var template;
     if (args.length === 1) {
         template = this.template.evaluate(symbols, check_only, args[0], true);
         // use template application to select overload
         if (template instanceof Value && template.type instanceof FunctionType) {
             return template;
         }
     } else {
         template = this.template.evaluate(symbols, check_only, undefined, true);
     }
     // put the template arguments into the parameters
     if (template instanceof Template) {
        if (template.parameters.length === args.length) {
            var template_symbols = copy_symbols(symbols);
            for (var i = 0; i < args.length; ++i) {
                template_symbols[template.parameters[i]] = [args[i]];
            }
            return template.content.evaluate(template_symbols, check_only);
        } else {
            this.error("Template argument number mismatch");
        }
     } else {
         this.error("Cannot apply template arguments to a non-template");
     }
}

function Member(object, member, loc) {
    this.object = object;
    this.member = member;
    this.location = loc;
}

Member.prototype = Object.create(Expression.prototype);
Member.prototype.evaluate = function (symbols, check_only) {
    var object = this.object.evaluate(symbols, check_only);
    if (!(object.type instanceof ClassType)) {
        this.error("Cannot get member of a non-class type");
    }
    var type = object.type.findMember(this.member);
    if (type === null) {
        this.error("Member " + this.member + " does not exist");
    }
    if (check_only) {
        return new Value(type, undefined);
    } else {
        return new Value(type, object.value[this.member]);
    }
};

function Instance(object, type, loc) {
    this.object = object;
    this.type = type;
    this.location = loc;
}
Instance.prototype = Object.create(Expression.prototype);
Instance.prototype.evaluate = function (symbols, check_only) {
    var object = this.object.evaluate(symbols, check_only);
    var type = this.type.evaluate(symbols);
    if (!(object.type instanceof ClassType)) {
        this.error("Cannot apply @instance on a non-class value");
    }
    if (check_only) {
        return new Value(NativeType.Boolean, undefined);
    } else {
        return new Value(NativeType.Boolean, object.value['@class'].compatibleWith(type));
    }
};

function Cast(object, type, default_value, loc) {
    this.object = object;
    this.type = type;
    this.default = default_value;
    this.location = loc;
}
Cast.prototype = Object.create(Expression.prototype);
Cast.prototype.evaluate = function (symbols, check_only) {
    var object = this.object.evaluate(symbols, check_only);
    var type = this.type.evaluate(symbols);
    var default_object = this.default.evaluate(symbols, true);
    if (!(default_value.type.compatibleWith(type))) {
        this.error("The default value of @cast is not compatible with the target type");
    }
    if (!(object.type instanceof ClassType)) {
        this.error("Cannot apply @instance on a non-class value");
    }
    if (check_only) {
        return new Value(type, undefined);
    } else {
        return new Value(
            type
            , object.value['@class'].compatibleWith(type) ? object.value : this.default.evaluate(symbols)
        );
    }
}

function ErrorExpression(message, loc) {
    this.message = message;
    this.location = loc;
}

ErrorExpression.prototype = Object.create(Expression.prototype);
ErrorExpression.prototype.evaluate = function (symbols, check_only) {
    if (!check_only) {
        this.error(this.message);
    } else {
        return new Value(new ErrorType(), undefined);
    }
};

module.exports.nodes = {
    Node : Node,

    TypeExpression : TypeExpression,
    TypeLiteral : TypeLiteral,
    ArrayTypeExpression : ArrayTypeExpression,
    FunctionTypeExpression : FunctionTypeExpression,
    IdentifierTypeExpression : IdentifierTypeExpression,
    
    Article : Article,

    Declaration : Declaration,
    Import : Import,
    Class : Class,
    Variable : Variable,
    Template : Template,

    Expression : Expression,
    Program : Program,
    Update : Update,
    Call : Call,
    Literal : Literal,
    ArrayLiteral : ArrayLiteral,
    Identifier : Identifier,
    FunctionExpression : FunctionExpression,
    If : If,
    Native : Native,
    TemplateApplication : TemplateApplication,
    Member : Member,
    Instance : Instance,
    Cast : Cast,
    ErrorExpression : ErrorExpression,

};

module.exports.load_std_lib = load_std_lib;


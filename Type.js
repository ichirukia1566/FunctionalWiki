"use strict";

var stack = [];

function InterpreterError(message, loc) {
    this.name = "InterpreterError";
    this.message = message;
    stack.unshift(loc);
    this.call_stack = stack.slice();
    stack = [];
}

InterpreterError.prototype = Object.create(Error.prototype);

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

function Value(type, value) {
    this.type = type;
    this.value = value;
}
Value.prototype = {};
Value.prototype.toString = function () {
    return this.type.print(this.value);
}

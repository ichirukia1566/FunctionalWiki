{
    // vim: filetype=javascript
    
    var interpreter = require('./interpreter');
    var nodes = interpreter.nodes;
    var types = interpreter.types;

    function named_location() {
        var l = location();
        l.title = options.title;
        return l;
    }

    function binary_operator(op, a, b, loc) {
        return new nodes.Call(new nodes.Call(new nodes.Identifier(op, loc), a, loc), b, loc);
    }
    
    function left_assoc(head, tail, loc) {
        if (tail.length === 0) {
            return head;
        } else {
            return binary_operator(
                tail[tail.length - 1][0]
                , left_assoc(head, tail.slice(0, tail.length - 1), loc)
                , tail[tail.length - 1][2]
                , loc
            );
        }
    }

    function generate_template(node, template_parameters) {
        if (template_parameters === null) {
            return node;
        } else {
            var ans = new nodes.Template(node.name, template_parameters, node, node.location);
            node.name = null;
            return ans;
        }
    }
}

head = x:('#code#' p:program '#end#' { return p; }/ passthrough)* {
    return new nodes.Article(x, named_location());
}

passthrough = $(!'#code#' .)

program
    = _ imports:import* declarations:declaration* expression:expression? {
        return new nodes.Program(imports, declarations, expression, named_location());
    }

import
    = "@import" _ from:source '.' _ i:identifier to:identifier? ';' _ {
        return new nodes.Import(from, i, to, named_location());
    }

source
    = i:identifier {return i;}
    / s:string_literal {return '@' + s.object.value.join('');}

declaration
    = class_declaration
    / variable_declaration
    
class_declaration
    = "@class" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier superclass:(":" _ type)? 
        "{" _ members:member_declaration* "}" _ { 
            return generate_template(
                new nodes.Class(name, superclass === null ? null : superclass[2], members, named_location())
                , t === null ? null : t[2]
            );
        }

variable_declaration
    = "@var" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier p:("(" _ parameter_list ")" _ )? type:(":" _ type)? 
        initialiser:initialiser { 
            return generate_template(
                new nodes.Variable(
                    name,
                    p === null ? [] : p[2],
                    type === null ? null : type[2], 
                    initialiser
                    , named_location()
                )
                , t === null ? null : t[2]
            ); 
        }

member_declaration
    = "@var" _ name:identifier p:("(" _ parameter_list ")" _ )? ":" _ type:type 
        initialiser:(initialiser / (";" _ )) { 
            return new nodes.Variable(
                name, 
                p === null ? [] : p[2],
                type, 
                initialiser instanceof Array ? null : initialiser
                , named_location()
            );
        }

initialiser
    = '=' _ i:expression ';' _ { return i; }
    / '{' _ p:program '}' _ { return p; }

template_parameter_list
    = head:identifier tail:("," _ identifier)* {
        var ans = [head];
        tail.forEach(
            function (o) {
                ans.push(o[2]);
            }
        );
        return ans;
    }

template_arguments_list
    = head:type tail:("," _ type)* {
        var ans = [head];
        Array.prototype.push.apply(
            ans,
            tail.map(
                function (o) {
                    return o[2];
                }
            )
        );
        return ans;
    }

parameter_list
    = head:parameter tail:("," _ parameter)* {
        var ans = [head];
        Array.prototype.push.apply(
            ans
            , tail.map(
                function (o) {
                    return o[2];
                }
            )
        );
        return ans;
    }
    / "" { return []; }
        
parameter
    = name:identifier ":" _ type:type {
        return {name : name, type : type};
    }

expression 
    = bor_expression
    
bor_expression 
    = head:xor_expression tail:('|' _ xor_expression)* { 
        return left_assoc(head, tail, named_location());
    }

xor_expression 
    = head:band_expression tail:('^' _ band_expression)* { 
        return left_assoc(head, tail, named_location());
    }

band_expression 
    = head:eq_expression tail:('&' _ eq_expression)* { 
        return left_assoc(head, tail, named_location());
    }

eq_expression 
    = head:comp_expression tail:(("==" / "!=") _ comp_expression)* {
        return left_assoc(head, tail, named_location());
    }

comp_expression 
    = head:shift_expression tail:(("<" / "<=" / ">=" / ">") _ shift_expression)* {
        return left_assoc(head, tail, named_location());
    }

shift_expression 
    = head:add_expression tail:(("<<" / ">>>" / ">>") _ add_expression)* { 
        return left_assoc(head, tail, named_location());
    }

add_expression 
    = head:mult_expression tail:(("+" / "-") _ mult_expression)* { 
        return left_assoc(head, tail, named_location());
    }

mult_expression 
    = head:unary_expression tail:(("*" / "/" / "%") _ unary_expression)* { 
        return left_assoc(head, tail, named_location());
    }

unary_expression 
    = postfix_expression
    / op:("+" / "-" / "~") _ expr:unary_expression { 
        if (op == "+") op = "++";
        if (op == "-") op = "--";
        return new nodes.Call(new nodes.Identifier(op, named_location()), expr, named_location());
    }   
    
postfix_expression
    = head:member_expression tail:member_expression* {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                return new nodes.Call(
                    recursion(head, tail.slice(0, tail.length - 1))
                    , tail[tail.length - 1]
                    , named_location()
                );
            }
        }
        return recursion(head, tail);
    }

member_update
    = '{' _ '}' _ {
        return [];
    }
    / '{' _ head:member_assignment tail:(
            (','/';') _ x:member_assignment {return x;}
        )* '}' _ 
    {
        tail.unshift(head);
        return tail;
    }

member_assignment
    = i:identifier '=' _ e:expression _ {
        return {name : i, value : e};
    }
    
member_expression
    = head:atom tail:
        (
            '.' _ identifier
            / member_update
        )* 
    {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                if (tail[tail.length - 1][0] === '.') {
                    return new nodes.Member(
                        recursion(head, tail.slice(0, tail.length - 1))
                        , tail[tail.length - 1][2]
                        , named_location()
                    );
                } else {
                    return new nodes.Update(
                        recursion(head, tail.slice(0, tail.length - 1))
                        , tail[tail.length - 1]
                        , named_location()
                    );
                }
            }
        }
        return recursion(head, tail);
    }

template_application 
    = i:identifier '<' _ t:template_arguments_list '>' _ {
        return new nodes.TemplateApplication(
            new nodes.Identifier(i, named_location())
            , t
            , named_location()
        );
    }
    
atom
    = literal
    / template_application
    / i:identifier { 
        return new nodes.Identifier(i, named_location());
    }
    / '(' _ e:expression ')' _ {
        return e;
    }
    / native_expression
    / if_expression
    / instance_expression
    / cast_expression
    / error_expression

if_expression
    = "@if" _ '(' _ cond:expression ',' _ then:expression ',' _
        e:expression ')' _ {
            return new nodes.If(cond, then, e, named_location());
        }

instance_expression
    = "@instance" _ '(' _ object:expression ',' _ type:type ')' _ {
        return new nodes.Instance(object, type, named_location());
    }

cast_expression
    = "@cast" _ '(' _ object:expression ',' _ type:type ',' _ e:expression')' _ {
        return new nodes.Cast(object, type, e, named_location());
    }

error_expression
    = "@error" _ '(' _ message:string_literal ')' _ {
        return new nodes.ErrorExpression(message.object.value.join(""), named_location());
    }

built_in_type
    = t:("@Character" / "@Integer" / "@Float" / "@Boolean" / "@Null") _ {
        return new nodes.TypeLiteral(
            types.NativeType[t.substr(1)]
            , named_location()
        );
    }

native_expression
    = '@native' _ '(' _ i:identifier ':' _ t:type ')' _ {
        return new nodes.Native(i, t, named_location());
    }

identifier
    = i:$ ([_a-zA-Z\xA0-\uFFFF][_a-zA-Z0-9\xA0-\uFFFF]*) _ {
        return i;
    }
    / '@operator' _ op:(
        '++' / '--' / '+' / '-' / '*' / '/' / '%'
        / '&' / '^' / '|' / '~' / '<<' / '>>>' / '>>'
        / '==' / '!=' / '<=' / '<' / '>=' / '>'
    ) _ {
        return op;
    }

type = s:(
    built_in_type
    / '[' _ t:type ']' _ {
        return new nodes.ArrayTypeExpression(t, named_location());
    }
    / '(' _ t:type ')' _ { return t; }
    / m:identifier {
        return new nodes.IdentifierTypeExpression(m, named_location());
    }
)+ {
    function recursion(s) {
        if (s.length === 1) {
            return s[0];
        } else {
            return new nodes.FunctionTypeExpression(
                s[0]
                , recursion(s.slice(1))
                , named_location()
            );
        }
    }
    return recursion(s);
}

literal
    = string_literal
    / char_literal
    / float_literal
    / int_literal
    / array_literal
    / function_literal
    
char_literal
    = "'" c:(char / '"') "'" _
        {
            return new nodes.Literal(
                new interpreter.Value(types.NativeType.Character, c)
                , named_location()
            );
        }

string_literal
    = "\"" c:(char / "'")* "\"" _ {
        return new nodes.Literal(
            new interpreter.Value(
                new types.ArrayType(types.NativeType.Character)
                , c
            )
            , named_location()
        );
    }

float_literal
    = (
        ([0-9]+ "." [0-9]* / "." [0-9]+) ([eE] [+-]? [0-9]+)? 
        / [0-9]+_ [eE] [+-]? [0-9]+
    ) _ {
        return new nodes.Literal(
            new interpreter.Value(
                types.NativeType.Float
                , parseFloat(text())
            ), named_location()
        );
    }
    
int_literal
    = ("0x"[0-9a-fA-F]+ / [1-9][0-9]* / '0' ) _ {
        var value = parseInt(text());
        if ((value | 0) !== value) {
            error("Integer literal out of bound");
        }
        return new nodes.Literal(
            new interpreter.Value(
                types.NativeType.Integer, value, named_location()
            )
        );
    }

array_literal
    = '[' _ es:(e:expression ',' _ {return e;})* ']' _ {
        return new nodes.ArrayLiteral(es, named_location());
    }
    / '[' _ head:(e:expression ',' _ {return e;})* tail:expression ']' _ {
        head.push(tail);
        return new nodes.ArrayLiteral(head, named_location());
    }

function_literal
    = '@function' _ p:('(' _ parameter_list ')'_ )? t:(':' _ type)? '{' _ e:program '}' _ {
        return new nodes.FunctionExpression(
            p === null ? [] : p[2]
            , t === null ? null : t[2]
            , e
            , named_location()
        );
    }
    
char
    = $ ((! ('\\' / '"' / "'")) .)
    / "\\" tail:(
        [bfnrtv\\'"] 
        / u:([0-7] / [0-7][0-7] / [0-3][0-7][0-7]) {
            if (u instanceof Array) u = u.join('');
            return {unicode : Number.parseInt(u, 8) };
        }
        / 'x' u:([0-9a-fA-F][0-9a-fA-F]) {
            return {unicode : Number.parseInt(u.join(''), 16) };
        }
        / 'u' u:([0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]) {
            return {unicode : Number.parseInt(u.join(''), 16) };
        }
        / 'u{' u:[0-9a-fA-F]* '}' { // ECMAScript 6 syntax
            return {unicode : Number.parseInt(u.join(''), 16) };
        }
    ) {
        switch (tail) {
            case '0': return '\0';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'v': return '\v';
            case '\\': return '\\';
            case "'": return "'";
            case '"': return '"';
            // ECMAScript 6
            default: return String.fromCodePoint(tail.unicode);
        }
    }

_ = (comment / whitespace)*

whitespace
    = [ \n\t\r\v]

comment
    = '/*' comment_tail / '//' [^\n]* ('\n' / EOF)

comment_tail
    = '*/' / . comment_tail

EOF = !.

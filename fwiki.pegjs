{
    function binary_operator(op, a, b) {
        return new Call(new Call(new Identifier(op), a), b);
    }
    
    function left_assoc(head, tail, callback) {
        if (tail.length === 0) {
            return head;
        } else {
            return binary_operator(
                tail[tail.length - 1][0]
                , left_assoc(head, tail.slice(0, tail.length - 1))
                , tail[tail.length - 1][2]
            );
        }
    }

    function generate_template(node, template_parameters) {
        if (template_parameters === null) {
            return node;
        } else {
            var ans = new Template(node.name, template_parameters, node);
            node.name = null;
            return ans;
        }
    }
}

program
    = _ imports:import* declarations:declaration* expression:expression {
        return new Program(imports, declarations, expression);
    }

import
    = "@import" _ from:qualified_identifier to:identifier? ";" _ { 
        return new Import(from, to);
    }

declaration
    = class_declaration
    / variable_declaration
    
class_declaration
    = "@class" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier superclass:(":" _ type)? 
        "{" _ members:member_declaration* "}" _ { 
            return generate_template(
                new Class(name, superclass === null ? null : superclass[2], members)
                , t === null ? null : t[2]
            );
        }

variable_declaration
    = "@var" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier p:("(" _ parameter_list ")" _ )? type:(":" _ type)? 
        initialiser:initialiser { 
            return generate_template(
                new Variable(
                    name,
                    p === null ? [] : p[2],
                    type === null ? null : type[2], 
                    initialiser
                )
                , t === null ? null : t[2]
            ); 
        }

member_declaration
    = "@var" _ name:identifier p:("(" _ parameter_list ")" _ )? ":" _ type:type 
        initialiser:(initialiser / (";" _ )) { 
            return new Variable(
                name, 
                p === null ? [] : p[2],
                type, 
                initialiser instanceof Array ? null : initialiser
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
    = code_expression
    
code_expression
    = or_expression

or_expression 
    = head:and_expression tail:('||' _ and_expression)* { 
        return left_assoc(head, tail);
    }

and_expression 
    = head:bor_expression tail:('&&' _ bor_expression)* { 
        return left_assoc(head, tail); 
    }

bor_expression 
    = head:xor_expression tail:('|' _ xor_expression)* { 
        return left_assoc(head, tail); 
    }

xor_expression 
    = head:band_expression tail:('^' _ band_expression)* { 
        return left_assoc(head, tail); 
    }

band_expression 
    = head:eq_expression tail:('&' _ eq_expression)* { 
        return left_assoc(head, tail); 
    }

eq_expression 
    = head:comp_expression tail:(("==" / "!=") _ comp_expression)* {
        return left_assoc(head, tail); 
    }

comp_expression 
    = head:shift_expression tail:(("<" / "<=" / ">=" / ">") _ shift_expression)* {
        return left_assoc(head, tail); 
    }

shift_expression 
    = head:add_expression tail:(("<<" / ">>") _ add_expression)* { 
        return left_assoc(head, tail); 
    }

add_expression 
    = head:mult_expression tail:(("+" / "-" / "++") _ mult_expression)* { 
        return left_assoc(head, tail); 
    }

mult_expression 
    = head:unary_expression tail:(("*" / "/" / "%") _ unary_expression)* { 
        return left_assoc(head, tail); 
    }

unary_expression 
    = postfix_expression
    / op:("+" / "-" / "!" / "~") _ expr:unary_expression { 
        return new Call(new Identifier(op), expr);
    }   
    
postfix_expression
    = head:template_member_expression tail:template_member_expression* {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                return new Call(
                    recursion(head, tail.slice(0, tail.length - 1))
                    , tail[tail.length - 1]
                );
            }
        }
        return recursion(head, tail);
    }
    / "@if" _ cond:template_member_expression then:template_member_expression 
        e:template_member_expression {
            return new If(cond, then, e);
        }

member_update
    = '{' _ '}' _ {
        return [];
    }
    / '{' head:member_assignment tail:(
            ';' _ x:member_assignment {return x;}
        )* '}' _ 
    {
        tail.unshift(head);
        return tail;
    }

member_assignment
    = i:identifier '=' _ e:expression _ {
        return {name : i, value : e};
    }
    
template_member_expression
    = head:atom tail:
        (
            '.' _ identifier
            / '<' _ template_arguments_list '>' _
            / member_update
        )* 
    {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                if (tail[tail.length - 1][0] === '.') {
                    return new Member(
                        recursion(head, tail.slice(0, tail.length - 1))
                        , tail[tail.length - 1][2]
                    );
                } else if (tail[tail.length - 1][0] === '<') {
                    return new TemplateApplication(
                        recursion(head, tail.slice(0, tail.length - 1))
                        , tail[tail.length - 1][2]
                    );
                } else {
                    return new Update(
                        recursion(head, tail.slice(0, tail.length - 1))
                        , tail[tail.length - 1]
                    );
                }
            }
        }
        return recursion(head, tail);
    }

atom
    = literal
    / i:identifier {
        return new Identifier(i);
    }
    / '(' _ e:expression ')' _ {
        return e;
    }
    / function_expression
    / native_expression

built_in_type
    = t:("@Character" / "@Integer" / "@Float" / "@Boolean") _ {
        return new TypeLiteral(NativeType[t.substr(1)]);
    }

native_expression
    = '@native' _ '(' _ i:identifier ':' _ t:type ')' _ {
        return new Native(i, t);
    }

function_expression
    = '@function' _ p:('(' _ parameter_list ')'_ )? t:(':' _ type)? '{' _ e:program '}' _ {
        return new FunctionExpression(
            p === null ? [] : p[2]
            , t === null ? null : t[2]
            , e
        );
    }
    
qualified_identifier
    = head:(
        ("." _)? (
            i:identifier {return {source : "internal", path : [i]};}
            / s:string_literal {return {source : "external", path : [s.value]};}
        )
    ) tail:("."  identifier)+ {
        var ans = head[1];
        tail.forEach(
            function (o) {
                ans.path.push(o[2]);
            }
        );
        return ans;
    }

identifier
    = i:$ ([_a-zA-Z\xA0-\uFFFF][_a-zA-Z0-9\xA0-\uFFFF]*) _ {
        return i;
    }
    / '@operator' _ op:(
        '++' / '+' / '-' / '*' / '/' / '%'
        / '&&' / '||' / '&' / '^' / '|' / '!' / '~' / '<<' / '>>'
        / '==' / '!=' / '<=' / '<' / '>=' / '>'
    ) _ {
        return op;
    }

type = s:(
    built_in_type
    / m:template_member_expression {
        return new IdentifierTypeExpression(m);
    }
    / '[' _ t:type ']' _ {
        return new ArrayTypeExpression(t);
    }
    / '(' _ t:type ')' _ { return t; }
)+ {
    function recursion(s) {
        if (s.length === 1) {
            return s[0];
        } else {
            return new FunctionTypeExpression(s[0], recursion(s.slice(1)));
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
    
char_literal
    = "'" c:(char / '"') "'" _
        {
            return new Literal(
                new Value(NativeType.Character, c)
            );
        }

string_literal
    = "\"" c:(char / "'")* "\"" _ {
        return new Literal(
            new Value(
                new ArrayType(NativeType.Character)
                , c
            )
        );
    }

float_literal
    = (
        ([0-9]+ "." [0-9]* / "." [0-9]+) ([eE] [+-]? [0-9]+)? 
        / [0-9]+_ [eE] [+-]? [0-9]+
    ) _ {
        return new Literal(new Value(NativeType.Float, parseFloat(text())));
    }
    
int_literal
    = ("0x"[0-9a-fA-F]+ / [0-9]+ ) _ {
        return new Literal(new Value(NativeType.Integer, parseInt(text())));
    }

array_literal
    = '[' _ es:(e:expression ',' _ {return e;})* ']' _ {
        return new ArrayLiteral(es);
    }
    / '[' _ head:(e:expression ',' _ {return e;})* tail:expression ']' _ {
        head.push(tail);
        return new ArrayLiteral(head);
    }

char
    = (! ('\\' / '"' / "'")) . {
        return text();
    }
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

{
    function binary_operator(op, a, b) {
        return {
            node : "call",
            function : {
                node : "call",
                function : {
                    node : "operator",
                    name : op
                },
                argument : a
            },
            argument : b
        };
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
}

program
    = imports:import* declarations:declaration* expression:expression {
        return {
            node : "program", 
            imports : imports, 
            declarations : declarations, 
            expression : expression
        }; 
    }

import
    = "@import" _ from:qualified_identifier to:identifier? ";" _ { 
        return {node : "import", from : from, to : to}; 
    }

declaration
    = class_declaration
    / variable_declaration
    
class_declaration
    = "@class" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier superclass:(":" _ type)? 
        "{" _ members:member_declaration* "}" _ { 
            return {
                node : "class", 
                name : name, 
                template_parameters : t === null ? null : t[2], 
                superclass : superclass === null ? null : superclass[2], 
                members:members
            }; 
        }

variable_declaration
    = "@var" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier p:("(" _ parameter_list ")" _ )? type:(":" _ type)? 
        initialiser:initialiser { 
            return {
                node : "var", 
                name : name, 
                template_parameters : t === null ? null : t[2], 
                parameters : p === null ? [] : p[2],
                type : type === null ? null : type[2], 
                initialiser:initialiser
            }; 
        }

member_declaration
    = p:("@private" _)? d:(
        class_declaration 
        / class_var_declaration 
        / static_declaration 
        / constructor_declaration
     ) { 
         d['private'] = p !== null; 
        return d;
     }
        
class_var_declaration
    = "@var" _ t:( "<" _ template_parameter_list ">" _ )?
        name:identifier p:("(" _ parameter_list ")" _ )? type:(":" _ type)? 
        initialiser:(initialiser / ";" _) { 
            return {
                node : "var", 
                name : name, 
                template_parameters : t === null ? null : t[2], 
                type : type === null ? null : type[2], 
                parameters : p === null ? [] : p[2],
                initialiser : initialiser instanceof Array ? null : initialiser
            }; 
        }

constructor_declaration
    = "@constructor" _ t:("<" _ template_parameter_list ">" _ )? 
        p:("(" _ parameter_list ")" _ )? initialiser:initialiser {
            return {
                node : "constructor", 
                template_parameters : t === null ? null : t[2], 
                parameters : p === null ? [] : p[2],
                initialiser : initialiser
            }; 
        }

static_declaration
    = "@static" _ t:("<" _ t:template_parameter_list ">" _ )? 
        name:identifier p:("(" _ p:parameter_list ")" _ )? type:(":" _ type)? 
        initialiser:initialiser {
            return {
                node : "static", 
                name : name, 
                template_parameters : t === null ? null : t[2], 
                type : type === null ? null : type[2], 
                parameters : p === null ? [] : p[2],
                initialiser : initialiser
            }; 
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

parameter_list
    = head:parameter tail:("," _ parameter)* {
        var ans = [head];
        tail.forEach(
            function (o) {
                ans.push(o[2]);
            }
        );
        return ans;
    }
        
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
        return {
            node : "call", 
            function : {
                node : "operator",
                name : op
            },
            arguments : [expr]
        }; 
    }   
    
postfix_expression
    = head:template_expression tail:template_expression* {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                  return {
                    node : "call",
                    function : recursion(head, tail.slice(0, tail.length - 1)), 
                    argument : tail[tail.length - 1]
                };
            }
        }
        return recursion(head, tail);
    }

    
template_expression
    = template_application
    / member_expression

template_application
    = t:identifier "<" _ a:template_parameter_list ">" _ {
        return {
            node : "template_application",
            template : t,
            arguments : a
        };
    }

member_expression
    = head:(atom / template_application) tail:('.' _ atom)* {
        function recursion(head, tail) {
            if (tail.length === 0) {
                return head;
            } else {
                return {
                    node : "member", 
                    object : recursion(head, tail.slice(0, tail.length - 1)),
                    member : tail[tail.length - 1][2]
                };
            }
        }
        return recursion(head, tail);
    }

atom
    = literal
    / i:identifier {
        return {node : "identifier", name : i};
    }
    / '(' _ e:expression ')' _ {
        return e;
    }
    / function_expression

function_expression
    = '@function' _ p:('(' _ parameter_list ')'_ )? t:(':' _ type)? '{' _ e:program '}' _ {
        return {
            node : "function",
            parameters : p === null ? [] : p[2],
            type : t === null ? null : t[2],
            body : e,
        };
    }
    
qualified_identifier
    = head:(("." _)? identifier) tail:("." _ identifier)* {
        var ans = [head[1]];
        tail.forEach(
            function (o) {
                ans.push(o[2]);
            }
        );
        return ans;
    }

identifier
    = [_a-zA-Z\xA0-\uFFFF][_a-zA-Z0-9\xA0-\uFFFF]* _ {
        return text().trim();
    }

type
    = template_application
    / i:identifier {
        return {node : "identifier", name : i};
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
            return {node : "literal", type : "Character", value : c};
        }

string_literal
    = "\"" c:(char / "'")* "\"" _ {
        return {node : "literal", type : "String", value : c.join('')};
    }

float_literal
    = (
        ([0-9]+ "." [0-9]* / "." [0-9]+) ([eE] [+-]? [0-9]+)? 
        / [0-9]+_ [eE] [+-]? [0-9]+
    ) {
        return {node : "literal", type : "Float", value : parseFloat(text())};
    }
    
int_literal
    = ("0x"[0-9a-fA-F]+ / [0-9]+ ) _ {
        return {node : "literal", type : "Integer", value : parseInt(text())};
    }

array_literal
    = '[' _ es:(e:expression ',' _ {return e;})* ']' _ {
        return {node : "array", elements : es};
    }
    / '[' _ head:(e:expression ',' _ {return e;})* tail:expression ']' _ {
        head.push(tail);
        return {node : "array", elements : head};
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

_ "whitespace"
    = [ \n\t\r\v]*




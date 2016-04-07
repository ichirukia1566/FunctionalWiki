function plain_text_generator(value, document_symbols) {
    var type = value['@class'];
    if (type.compatibleWith(document_symbols['PlainText'][0])) {
        return value.content.join('');
    } else if (
        type.compatibleWith(document_symbols['StrongText'][0]) 
        || type.compatibleWith(document_symbols['EmphasisedText'][0])
        || type.compatibleWith(document_symbols['StyledText'][0])
        || type.compatibleWith(document_symbols['TableCell'][0])
        || type.compatibleWith(document_symbols['Heading'][0])
    ) {
        return plain_text_generator(value.content, document_symbols);
    } else if (type.compatibleWith(document_symbols['Table'][0])) {
        return value.cells.map(
            function (row) {
                return row.map(
                    function (cell) {
                        return plain_text_generator(cell, document_symbols);
                    }
                ).join('\t');
            }
        ).join('\n');
    } else if (type.compatibleWith(document_symbols['TextSequence'][0])) {
        return value.content.map(
            function (segment) {
                return plain_text_generator(segment, document_symbols);
            }
        ).join('');
    } else {
        throw new NotImplementedException("Rendering of " + type.name + " is not implemented");
    }
}

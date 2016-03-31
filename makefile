fwiki.js : fwiki.pegjs
	pegjs -e parser --allowed-start-rules head,program fwiki.pegjs

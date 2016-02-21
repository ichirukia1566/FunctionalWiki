<?php
	$filename = $_GET['filename'] . ".fwiki";
	$myfile = fopen($filename, "w") or die("Unable to open file!");
	$txt = str_replace("<br>", "\n", $_GET['code']);
	if ($txt != "")
		fwrite($myfile, $txt);
	echo $txt;
	fclose($myfile);
?>
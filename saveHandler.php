<?php
	$filename = $_GET['filename'] . ".fwiki";
	$myfile = fopen($filename, "w") or die("Unable to open file!");
	$txt = nl2br($_GET['code'], true);
	if ($txt != "")
		fwrite($myfile, $txt);
	echo $txt;
	fclose($myfile);
?>

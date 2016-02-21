<?php
	$filename = $_GET['filename'] . ".fwiki";
	$myfile = fopen($filename, "r") or die("Unable to open file!");
	$txt = fread($myfile, filesize($filename));
	echo $txt;
	fclose($myfile);
?>